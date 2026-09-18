import * as path from 'node:path';
import { SSM_PATHS } from '@asli/contracts';
import {
  Duration,
  Stack,
  aws_dynamodb as dynamodb,
  aws_lambda as lambda,
  aws_lambda_event_sources as eventSources,
  aws_sns as sns,
  aws_sqs as sqs,
  type App,
} from 'aws-cdk-lib';
import { nodeFn } from '../node-fn';
import { importParam } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane G2: new-alert fan-out (docs/ALERTS.md "New-alert fan-out"). A single stream consumer
 * on FlaggedBatches (INSERT only) that finds saved medicines matching a newly ingested CDSCO
 * row, writes idempotent MATCH items, bumps MED.latestTier, and publishes AlertEvent to the
 * shared alerts SNS topic for G1 to send.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneG2Stack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  const flaggedBatchesTableName = importParam(stack, shared, SSM_PATHS.table('flagged-batches'));
  const flaggedBatchesStreamArn = importParam(stack, shared, SSM_PATHS.tableStream('flagged-batches'));
  const ingestionStateTableName = importParam(stack, shared, SSM_PATHS.table('ingestion-state'));
  const cabinetsTableName = importParam(stack, shared, SSM_PATHS.table('cabinets'));
  const referenceTableName = importParam(stack, shared, SSM_PATHS.table('reference'));
  const alertsTopicArn = importParam(stack, shared, SSM_PATHS.sns.alerts);
  const streamDlqArn = importParam(stack, shared, SSM_PATHS.dlq.arn);

  const flaggedBatchesTable = dynamodb.Table.fromTableAttributes(stack, 'FlaggedBatchesTable', {
    tableName: flaggedBatchesTableName,
    tableStreamArn: flaggedBatchesStreamArn,
  });
  const ingestionStateTable = dynamodb.Table.fromTableName(stack, 'IngestionStateTable', ingestionStateTableName);
  const cabinetsTable = dynamodb.Table.fromTableAttributes(stack, 'CabinetsTable', {
    tableName: cabinetsTableName,
    globalIndexes: ['GSI1', 'GSI2', 'GSI3'],
  });
  const referenceTable = dynamodb.Table.fromTableName(stack, 'ReferenceTable', referenceTableName);
  const alertsTopic = sns.Topic.fromTopicArn(stack, 'AlertsTopic', alertsTopicArn);
  const streamDlq = sqs.Queue.fromQueueArn(stack, 'StreamDlq', streamDlqArn);

  const streamConsumerFn = nodeFn(stack, 'StreamConsumerHandler', {
    serviceName: 'g2-fanout-stream-consumer',
    entry: path.join(__dirname, '../../../services/fanout/src/handlers/stream-consumer.ts'),
    environment: {
      FLAGGED_BATCHES_TABLE: flaggedBatchesTableName,
      INGESTION_STATE_TABLE: ingestionStateTableName,
      CABINETS_TABLE: cabinetsTableName,
      REFERENCE_TABLE: referenceTableName,
      ALERTS_TOPIC_ARN: alertsTopicArn,
    },
    timeout: Duration.seconds(60),
  });

  flaggedBatchesTable.grantStreamRead(streamConsumerFn);
  ingestionStateTable.grantReadData(streamConsumerFn);
  cabinetsTable.grantReadWriteData(streamConsumerFn);
  referenceTable.grantReadData(streamConsumerFn);
  alertsTopic.grantPublish(streamConsumerFn);

  streamConsumerFn.addEventSource(
    new eventSources.DynamoEventSource(flaggedBatchesTable, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 100,
      bisectBatchOnError: true,
      retryAttempts: 3,
      onFailure: new eventSources.SqsDlq(streamDlq),
    }),
  );
}
