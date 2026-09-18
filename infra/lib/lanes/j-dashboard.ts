import * as path from 'node:path';
import { SSM_PATHS } from '@asli/contracts';
import {
  Duration,
  Stack,
  aws_apigatewayv2 as apigwv2,
  aws_budgets as budgets,
  aws_cloudwatch as cloudwatch,
  aws_cloudwatch_actions as cloudwatchActions,
  aws_iam as iam,
  aws_s3 as s3,
  aws_sns as sns,
  aws_sqs as sqs,
  type App,
} from 'aws-cdk-lib';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

const NAMESPACE = 'Asli';

/** `Asli` EMF metric, dimensioned by `stage` (docs/OBSERVABILITY_AND_COST.md "Metrics"). */
function metric(stage: string, metricName: string, extraDimensions: Record<string, string> = {}): cloudwatch.Metric {
  return new cloudwatch.Metric({
    namespace: NAMESPACE,
    metricName,
    dimensionsMap: { stage, ...extraDimensions },
    period: Duration.minutes(5),
  });
}

/**
 * Lane J: `GET /v1/public/metrics` (docs/API.md), the CloudWatch dashboard, and alarms
 * (docs/OBSERVABILITY_AND_COST.md "CloudWatch dashboard" and "Alarms").
 *
 * Budget note (Handoff "Contract change requests"): AWS Budgets needs the destination SNS
 * topic to grant `budgets.amazonaws.com` publish access in its resource policy. The ops topic
 * is created in `infra/lib/shared-stack.ts` (T02's lane), which this stack only imports by ARN
 * - it cannot add a policy statement to a topic it doesn't own. The CfnBudget below still
 * subscribes the topic; if budget alerts don't arrive, T02 needs to add that principal to
 * `OpsTopic`'s policy.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneJStack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  const publicBucketName = importParam(stack, shared, SSM_PATHS.bucket('public'));
  const publicBucket = s3.Bucket.fromBucketName(stack, 'PublicBucket', publicBucketName);
  const opsTopicArn = importParam(stack, shared, SSM_PATHS.sns.ops);
  const opsTopic = sns.Topic.fromTopicArn(stack, 'OpsTopic', opsTopicArn);
  const dlqArn = importParam(stack, shared, SSM_PATHS.dlq.arn);
  const dlq = sqs.Queue.fromQueueArn(stack, 'StreamDlq', dlqArn);

  // ---- GET /v1/public/metrics ----
  const publicMetricsFn = nodeFn(stack, 'PublicMetricsHandler', {
    serviceName: 'j-public-metrics',
    entry: path.join(__dirname, '../../../services/metrics/src/handlers/public-metrics.ts'),
    environment: { STAGE: stage, PUBLIC_BUCKET_NAME: publicBucketName },
    timeout: Duration.seconds(15),
  });
  publicBucket.grantRead(publicMetricsFn, 'metrics/*');
  publicMetricsFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['cloudwatch:GetMetricData'],
      resources: ['*'],
    }),
  );
  addRoute(stack, stage, apigwv2.HttpMethod.GET, '/v1/public/metrics', publicMetricsFn, { auth: 'public' });

  // ---- Alarms (docs/OBSERVABILITY_AND_COST.md "Alarms", to `asli-<stage>-ops`) ----
  new cloudwatch.Alarm(stack, 'IngestionFailedAlarm', {
    alarmName: `asli-${stage}-ingestion-failed`,
    metric: metric(stage, 'IngestionFailed').with({ statistic: 'Sum' }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  }).addAlarmAction(new cloudwatchActions.SnsAction(opsTopic));

  new cloudwatch.Alarm(stack, 'StreamDlqDepthAlarm', {
    alarmName: `asli-${stage}-stream-dlq-depth`,
    metric: dlq.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(5), statistic: 'Maximum' }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  }).addAlarmAction(new cloudwatchActions.SnsAction(opsTopic));

  // Account-wide Lambda errors, via a CloudWatch Metrics Insights query (no single
  // "all Asli functions" dimension exists, so this reads the built-in AWS/Lambda namespace
  // across every function in the account rather than listing each lane's function by name).
  // NOTE (fixed by X during int deploy, 2026-09-19): the original version combined two
  // Metrics Insights SELECT queries (errors, invocations) via a further math expression
  // (errorRatePct) into one alarm - CloudFormation rejected this with "Invalid metrics list"
  // on real deploy (CloudWatch Alarms support only one Metrics Insights query per alarm, not
  // several combined arithmetically - undocumented in this repo, only surfaced by a real
  // `cdk deploy`). Reduced to a raw account-wide error-count alarm (single Metrics Insights
  // query, no ratio) rather than an error-rate percentage - J should revisit if it wants the
  // rate back, e.g. by emitting a per-scan error-rate EMF metric instead of computing it here.
  new cloudwatch.CfnAlarm(stack, 'LambdaErrorRateAlarm', {
    alarmName: `asli-${stage}-lambda-errors`,
    alarmDescription:
      'Lambda errors > 10 over 5 minutes, account-wide (docs/OBSERVABILITY_AND_COST.md) - reduced from an error-rate percentage to a raw count; see the NOTE above this alarm in j-dashboard.ts',
    metrics: [
      {
        id: 'errors',
        expression: 'SELECT SUM(Errors) FROM SCHEMA("AWS/Lambda")',
        period: 300,
        returnData: true,
      },
    ],
    threshold: 10,
    evaluationPeriods: 1,
    comparisonOperator: 'GreaterThanThreshold',
    treatMissingData: 'notBreaching',
    alarmActions: [opsTopic.topicArn],
  });

  // Monthly AWS Budgets alert at 50% and 80% of the team's credit amount (default $100,
  // override with TEAM_CREDIT_USD at synth time once the real credit amount is known).
  const teamCreditUsd = Number(process.env.TEAM_CREDIT_USD ?? 100);
  new budgets.CfnBudget(stack, 'TeamCreditBudget', {
    budget: {
      budgetName: `asli-${stage}-team-credit`,
      budgetType: 'COST',
      timeUnit: 'MONTHLY',
      budgetLimit: { amount: teamCreditUsd, unit: 'USD' },
    },
    notificationsWithSubscribers: [50, 80].map((pct) => ({
      notification: {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: pct,
        thresholdType: 'PERCENTAGE',
      },
      subscribers: [{ subscriptionType: 'SNS', address: opsTopic.topicArn }],
    })),
  });

  // ---- Dashboard (docs/OBSERVABILITY_AND_COST.md "CloudWatch dashboard") ----
  new cloudwatch.Dashboard(stack, 'Dashboard', {
    dashboardName: `asli-${stage}`,
    widgets: [
      [
        new cloudwatch.TextWidget({ markdown: `# Asli - ${stage}`, width: 24, height: 1 }),
      ],
      [
        new cloudwatch.GraphWidget({
          title: 'Ingestion: rows, failures',
          left: [metric(stage, 'IngestedRows').with({ statistic: 'Sum', label: 'Ingested rows' })],
          right: [metric(stage, 'IngestionFailed').with({ statistic: 'Sum', label: 'Failures' })],
          width: 12,
        }),
        new cloudwatch.GraphWidget({
          title: 'Scans: volume, latency p50/p95',
          left: [metric(stage, 'ScanLatencyMs').with({ statistic: 'SampleCount', label: 'Scan count' })],
          right: [
            metric(stage, 'ScanLatencyMs').with({ statistic: 'p50', label: 'Latency p50 (ms)' }),
            metric(stage, 'ScanLatencyMs').with({ statistic: 'p95', label: 'Latency p95 (ms)' }),
          ],
          width: 12,
        }),
      ],
      [
        new cloudwatch.GraphWidget({
          title: 'Scans: failures, edits',
          left: [
            metric(stage, 'ExtractionFailed').with({ statistic: 'Sum', label: 'Extraction failed' }),
            metric(stage, 'BatchEditedByUser').with({ statistic: 'Sum', label: 'Edited by user' }),
          ],
          width: 12,
        }),
        new cloudwatch.GraphWidget({
          title: 'Matching: tiers, matches created',
          left: [
            metric(stage, 'CheckTier', { tier: 'FLAGGED' }).with({ statistic: 'Sum', label: 'FLAGGED' }),
            metric(stage, 'CheckTier', { tier: 'VERIFY' }).with({ statistic: 'Sum', label: 'VERIFY' }),
            metric(stage, 'CheckTier', { tier: 'NO_ALERT_FOUND' }).with({ statistic: 'Sum', label: 'NO_ALERT_FOUND' }),
          ],
          right: [metric(stage, 'MatchesCreated').with({ statistic: 'Sum', label: 'Matches created' })],
          width: 12,
        }),
      ],
      [
        new cloudwatch.GraphWidget({
          title: 'Alerts: push/email sent and failed',
          left: [
            metric(stage, 'PushSent').with({ statistic: 'Sum', label: 'Push sent' }),
            metric(stage, 'EmailSent').with({ statistic: 'Sum', label: 'Email sent' }),
          ],
          right: [
            metric(stage, 'PushFailed').with({ statistic: 'Sum', label: 'Push failed' }),
            metric(stage, 'EmailFailed').with({ statistic: 'Sum', label: 'Email failed' }),
          ],
          width: 12,
        }),
        new cloudwatch.GraphWidget({
          title: 'Cost: Bedrock/Textract/Translate/Polly usage (per 1,000 scans in packages/contracts/src/pricing.ts)',
          left: [
            metric(stage, 'BedrockInputTokens').with({ statistic: 'Sum', label: 'Bedrock input tokens' }),
            metric(stage, 'BedrockOutputTokens').with({ statistic: 'Sum', label: 'Bedrock output tokens' }),
          ],
          right: [
            metric(stage, 'TextractPages').with({ statistic: 'Sum', label: 'Textract pages' }),
            metric(stage, 'TranslateCharacters').with({ statistic: 'Sum', label: 'Translate characters' }),
            metric(stage, 'PollyCharacters').with({ statistic: 'Sum', label: 'Polly characters' }),
          ],
          width: 12,
        }),
      ],
    ],
  });
}
