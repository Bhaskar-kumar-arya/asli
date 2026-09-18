import * as path from 'node:path';
import {
  Duration,
  Stack,
  aws_apigatewayv2 as apigwv2,
  aws_iam as iam,
  aws_s3 as s3,
  aws_scheduler as scheduler,
  aws_sns as sns,
  aws_ssm as ssm,
  aws_stepfunctions as sfn,
} from 'aws-cdk-lib';
import type { App } from 'aws-cdk-lib';
import { SSM_PATHS } from '@asli/contracts';
import { buildIngestDefinition } from '../../../services/ingestion/statemachine/build';
import { addRoute } from '../api-routes';
import { cdkEnv, sharedStage, stackName } from '../stage';
import { nodeFn } from '../node-fn';
import { importParam, ssmName } from '../ssm';

const INGESTION_SRC = path.join(__dirname, '../../../services/ingestion/src');
const ADMIN_DEMO_SRC = path.join(__dirname, '../../../services/admin-demo/src');

/**
 * Lane A2: the ingestion state machine, its daily new-month check, backfill
 * support, demo replay, and the Reference builder (docs/ARCHITECTURE.md,
 * plan/tasks/A2-ingestion-pipeline.md). One stack per infra/lib/lanes/README.md.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneA2Stack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  // ---- Imported shared resources ----
  const rawBucketName = importParam(stack, shared, SSM_PATHS.bucket('raw'));
  const flaggedBatchesTable = importParam(stack, shared, SSM_PATHS.table('flagged-batches'));
  const ingestionStateTable = importParam(stack, shared, SSM_PATHS.table('ingestion-state'));
  const referenceTable = importParam(stack, shared, SSM_PATHS.table('reference'));
  const opsTopicArn = importParam(stack, shared, SSM_PATHS.sns.ops);
  // Reused for the reason classifier too - it's a general Converse-API model
  // id despite the "vision" name (see this task's Handoff Gotchas).
  const bedrockModelId = importParam(stack, shared, SSM_PATHS.bedrock.visionModelId);

  const rawBucket = s3.Bucket.fromBucketName(stack, 'RawBucket', rawBucketName);
  const opsTopic = sns.Topic.fromTopicArn(stack, 'OpsTopic', opsTopicArn);

  const commonEnv = {
    RAW_BUCKET_NAME: rawBucketName,
    FLAGGED_BATCHES_TABLE: flaggedBatchesTable,
    INGESTION_STATE_TABLE: ingestionStateTable,
    REFERENCE_TABLE: referenceTable,
    OPS_TOPIC_ARN: opsTopicArn,
    BEDROCK_TEXT_MODEL_ID: bedrockModelId,
    STAGE: stage,
  };

  // ---- State machine task Lambdas ----
  const expandWorkFn = nodeFn(stack, 'ExpandWorkHandler', {
    serviceName: 'a2-expand-work',
    entry: path.join(INGESTION_SRC, 'handlers/expand-work.ts'),
    environment: commonEnv,
  });

  const markRunningFn = nodeFn(stack, 'MarkRunningHandler', {
    serviceName: 'a2-mark-running',
    entry: path.join(INGESTION_SRC, 'handlers/mark-running.ts'),
    environment: commonEnv,
  });

  const fetchMonthFn = nodeFn(stack, 'FetchMonthHandler', {
    serviceName: 'a2-fetch-month',
    entry: path.join(INGESTION_SRC, 'handlers/fetch-month.ts'),
    environment: commonEnv,
    timeout: Duration.seconds(60),
  });

  const loadFixtureFn = nodeFn(stack, 'LoadFixtureHandler', {
    serviceName: 'a2-load-fixture',
    entry: path.join(INGESTION_SRC, 'handlers/load-fixture.ts'),
    environment: commonEnv,
  });

  const normalizeAndWriteFn = nodeFn(stack, 'NormalizeAndWriteHandler', {
    serviceName: 'a2-normalize-and-write',
    entry: path.join(INGESTION_SRC, 'handlers/normalize-and-write.ts'),
    environment: commonEnv,
    timeout: Duration.seconds(120),
    memorySize: 1024,
  });

  const markDoneFn = nodeFn(stack, 'MarkDoneHandler', {
    serviceName: 'a2-mark-done',
    entry: path.join(INGESTION_SRC, 'handlers/mark-done.ts'),
    environment: commonEnv,
  });

  const markFailedFn = nodeFn(stack, 'MarkFailedHandler', {
    serviceName: 'a2-mark-failed',
    entry: path.join(INGESTION_SRC, 'handlers/mark-failed.ts'),
    environment: commonEnv,
  });

  const invokeStatsFn = nodeFn(stack, 'InvokeStatsHandler', {
    serviceName: 'a2-invoke-stats',
    entry: path.join(INGESTION_SRC, 'handlers/invoke-stats.ts'),
    environment: commonEnv,
  });
  // Lane S's stats-job ARN isn't known at synth time (it may not be deployed
  // yet - see invoke-stats.ts) - GetParameter is scoped to the one path this
  // handler reads; InvokeFunction is wildcard since the target ARN is only
  // known once that parameter resolves at runtime.
  invokeStatsFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${stack.region}:${stack.account}:parameter/asli/${stage}/lambda/statsJobArn`],
    }),
  );
  invokeStatsFn.addToRolePolicy(new iam.PolicyStatement({ actions: ['lambda:InvokeFunction'], resources: ['*'] }));

  const buildReferenceFn = nodeFn(stack, 'BuildReferenceHandler', {
    serviceName: 'a2-build-reference',
    entry: path.join(INGESTION_SRC, 'handlers/build-reference.ts'),
    environment: commonEnv,
    timeout: Duration.seconds(60),
  });

  // ---- Permissions for the task Lambdas ----
  rawBucket.grantPut(fetchMonthFn);
  rawBucket.grantRead(fetchMonthFn); // A1's client reuses the same S3 client for GET (reportingMonths etc.)
  rawBucket.grantReadWrite(loadFixtureFn);
  rawBucket.grantRead(normalizeAndWriteFn);
  rawBucket.grantPut(buildReferenceFn);

  for (const fn of [markRunningFn, markDoneFn, markFailedFn]) {
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem'],
        resources: [`arn:aws:dynamodb:${stack.region}:${stack.account}:table/${ingestionStateTable}`],
      }),
    );
  }
  opsTopic.grantPublish(markFailedFn);

  normalizeAndWriteFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['dynamodb:PutItem', 'dynamodb:ConditionCheckItem'],
      resources: [`arn:aws:dynamodb:${stack.region}:${stack.account}:table/${flaggedBatchesTable}`],
    }),
  );
  // normalizeAndWriteFn only reads/writes the reason-cache REASON# item now (no
  // aliases dep - see this task's Handoff on why alias resolution moved out of
  // ingestion); buildReferenceFn writes the MFR#/ALIAS# and BRAND#/MFR# rows.
  normalizeAndWriteFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['dynamodb:GetItem', 'dynamodb:PutItem'],
      resources: [`arn:aws:dynamodb:${stack.region}:${stack.account}:table/${referenceTable}`],
    }),
  );
  buildReferenceFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['dynamodb:PutItem'],
      resources: [`arn:aws:dynamodb:${stack.region}:${stack.account}:table/${referenceTable}`],
    }),
  );
  buildReferenceFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['dynamodb:Scan'],
      resources: [`arn:aws:dynamodb:${stack.region}:${stack.account}:table/${flaggedBatchesTable}`],
    }),
  );

  // Bedrock model id comes from an SSM token resolved at deploy time, so its
  // ARN can't be pinned at synth time - wildcard is the pragmatic choice for
  // this hackathon's timeline (see this task's Handoff Gotchas).
  normalizeAndWriteFn.addToRolePolicy(
    new iam.PolicyStatement({ actions: ['bedrock:InvokeModel'], resources: ['*'] }),
  );

  // ---- Step Functions state machine ----
  const taskFns = [
    expandWorkFn,
    markRunningFn,
    fetchMonthFn,
    loadFixtureFn,
    normalizeAndWriteFn,
    markDoneFn,
    markFailedFn,
    invokeStatsFn,
    buildReferenceFn,
  ];

  const sfnRole = new iam.Role(stack, 'IngestStateMachineRole', {
    assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
  });
  for (const fn of taskFns) {
    fn.grantInvoke(sfnRole);
  }
  sfnRole.addToPolicy(
    new iam.PolicyStatement({ actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'], resources: ['*'] }),
  );

  const definition = buildIngestDefinition({
    expandWork: expandWorkFn.functionArn,
    markRunning: markRunningFn.functionArn,
    fetchMonth: fetchMonthFn.functionArn,
    loadFixture: loadFixtureFn.functionArn,
    normalizeAndWrite: normalizeAndWriteFn.functionArn,
    markDone: markDoneFn.functionArn,
    markFailed: markFailedFn.functionArn,
    invokeStats: invokeStatsFn.functionArn,
    buildReference: buildReferenceFn.functionArn,
  });

  const stateMachine = new sfn.CfnStateMachine(stack, 'IngestStateMachine', {
    stateMachineName: `asli-${stage}-ingest`,
    roleArn: sfnRole.roleArn,
    definitionString: JSON.stringify(definition),
    tracingConfiguration: { enabled: true },
  });

  new ssm.StringParameter(stack, 'IngestStateMachineArnParam', {
    parameterName: ssmName(stage, '/a2/ingestStateMachineArn'),
    stringValue: stateMachine.attrArn,
  });

  const startExecutionPolicy = new iam.PolicyStatement({
    actions: ['states:StartExecution'],
    resources: [stateMachine.attrArn],
  });

  // ---- check-months (EventBridge Scheduler, daily 06:30 IST = 01:00 UTC) ----
  const checkMonthsFn = nodeFn(stack, 'CheckMonthsHandler', {
    serviceName: 'a2-check-months',
    entry: path.join(INGESTION_SRC, 'handlers/check-months.ts'),
    environment: { ...commonEnv, STATE_MACHINE_ARN: stateMachine.attrArn },
  });
  checkMonthsFn.addToRolePolicy(startExecutionPolicy);
  checkMonthsFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['dynamodb:GetItem'],
      resources: [`arn:aws:dynamodb:${stack.region}:${stack.account}:table/${ingestionStateTable}`],
    }),
  );

  const schedulerRole = new iam.Role(stack, 'CheckMonthsSchedulerRole', {
    assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
  });
  checkMonthsFn.grantInvoke(schedulerRole);

  new scheduler.CfnSchedule(stack, 'CheckMonthsSchedule', {
    name: `asli-${stage}-check-months-daily`,
    scheduleExpression: 'cron(0 1 * * ? *)',
    flexibleTimeWindow: { mode: 'OFF' },
    target: {
      arn: checkMonthsFn.functionArn,
      roleArn: schedulerRole.roleArn,
    },
  });

  // ---- Demo replay admin API route (docs/API.md, docs/ALERTS.md demo path) ----
  // "stage int only" per docs/API.md: only int's stack should ever set this
  // env var to "int". Any other stage (including this lane's own dev-a2)
  // gates on its own STAGE, so the lane can still test the endpoint itself
  // without touching int (CLAUDE.md: only T02/X/Z1 deploy there).
  const demoReplayFn = nodeFn(stack, 'DemoReplayHandler', {
    serviceName: 'a2-demo-replay',
    entry: path.join(ADMIN_DEMO_SRC, 'handler.ts'),
    environment: {
      STATE_MACHINE_ARN: stateMachine.attrArn,
      STAGE: stage,
      DEMO_REPLAY_ALLOWED_STAGE: stage === 'int' ? 'int' : stage,
    },
  });
  demoReplayFn.addToRolePolicy(startExecutionPolicy);

  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/admin/demo/replay-month', demoReplayFn, { auth: 'admin' });
}
