import * as path from 'node:path';
import { SSM_PATHS } from '@asli/contracts';
import {
  Duration,
  Stack,
  aws_apigatewayv2 as apigwv2,
  aws_dynamodb as dynamodb,
  aws_lambda as lambda,
  aws_lambda_event_sources as eventSources,
  aws_sns as sns,
  aws_sqs as sqs,
} from 'aws-cdk-lib';
import type { App } from 'aws-cdk-lib';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane F: cabinet CRUD + retroactive check (docs/API.md cabinets endpoints,
 * docs/ALERTS.md "Retroactive check"). Imports shared tables/topic/DLQ/HTTP API
 * from SharedStack (T02) via SSM; owns no shared resources itself.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneFStack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  const cabinetsTableName = importParam(stack, shared, SSM_PATHS.table('cabinets'));
  const cabinetsStreamArn = importParam(stack, shared, SSM_PATHS.tableStream('cabinets'));
  // globalIndexes required so grantReadWriteData below also covers the GSI ARNs -
  // listMembershipsForUser (repo.ts) queries GSI1, without it dynamodb:Query on the
  // index is denied even though the base table grant succeeds (see the same note on
  // flaggedBatchesTable below).
  const cabinetsTable = dynamodb.Table.fromTableAttributes(stack, 'CabinetsTable', {
    tableName: cabinetsTableName,
    tableStreamArn: cabinetsStreamArn,
    globalIndexes: ['GSI1', 'GSI2', 'GSI3'],
  });

  const flaggedBatchesTableName = importParam(stack, shared, SSM_PATHS.table('flagged-batches'));
  // fromTableAttributes (not fromTableName) so grantReadData below also covers the GSI1
  // index ARN - the retroactive check queries GSI1 to find skeleton-match candidates.
  const flaggedBatchesTable = dynamodb.Table.fromTableAttributes(stack, 'FlaggedBatchesTable', {
    tableName: flaggedBatchesTableName,
    globalIndexes: ['GSI1'],
  });

  const ingestionStateTableName = importParam(stack, shared, SSM_PATHS.table('ingestion-state'));
  const ingestionStateTable = dynamodb.Table.fromTableName(stack, 'IngestionStateTable', ingestionStateTableName);

  const idempotencyTableName = importParam(stack, shared, SSM_PATHS.table('idempotency'));
  const idempotencyTable = dynamodb.Table.fromTableName(stack, 'IdempotencyTable', idempotencyTableName);

  const alertsTopicArn = importParam(stack, shared, SSM_PATHS.sns.alerts);
  const alertsTopic = sns.Topic.fromTopicArn(stack, 'AlertsTopic', alertsTopicArn);

  const dlqArn = importParam(stack, shared, SSM_PATHS.dlq.arn);
  const dlq = sqs.Queue.fromQueueArn(stack, 'StreamDlq', dlqArn);

  const commonEnv = {
    CABINETS_TABLE_NAME: cabinetsTableName,
    FLAGGED_BATCHES_TABLE_NAME: flaggedBatchesTableName,
    INGESTION_STATE_TABLE_NAME: ingestionStateTableName,
    IDEMPOTENCY_TABLE_NAME: idempotencyTableName,
    ALERTS_TOPIC_ARN: alertsTopicArn,
  };

  const entry = (file: string) => path.join(__dirname, '../../../services/cabinet/src', file);

  const listCabinetsFn = nodeFn(stack, 'ListCabinetsHandler', {
    serviceName: 'f-cabinet-list',
    entry: entry('handlers/list-cabinets.ts'),
    environment: commonEnv,
  });
  const createCabinetFn = nodeFn(stack, 'CreateCabinetHandler', {
    serviceName: 'f-cabinet-create',
    entry: entry('handlers/create-cabinet.ts'),
    environment: commonEnv,
  });
  const getCabinetFn = nodeFn(stack, 'GetCabinetHandler', {
    serviceName: 'f-cabinet-get',
    entry: entry('handlers/get-cabinet.ts'),
    environment: commonEnv,
  });
  const addMedicineFn = nodeFn(stack, 'AddMedicineHandler', {
    serviceName: 'f-cabinet-add-medicine',
    entry: entry('handlers/add-medicine.ts'),
    environment: commonEnv,
  });
  const deleteMedicineFn = nodeFn(stack, 'DeleteMedicineHandler', {
    serviceName: 'f-cabinet-delete-medicine',
    entry: entry('handlers/delete-medicine.ts'),
    environment: commonEnv,
  });
  const retroactiveCheckFn = nodeFn(stack, 'RetroactiveCheckHandler', {
    serviceName: 'f-cabinet-retroactive-check',
    entry: entry('stream/retroactive-check.ts'),
    environment: commonEnv,
    timeout: Duration.seconds(60),
  });

  for (const fn of [listCabinetsFn, createCabinetFn, getCabinetFn, addMedicineFn, deleteMedicineFn]) {
    cabinetsTable.grantReadWriteData(fn);
    idempotencyTable.grantReadWriteData(fn);
  }
  cabinetsTable.grantReadWriteData(retroactiveCheckFn);
  flaggedBatchesTable.grantReadData(retroactiveCheckFn);
  ingestionStateTable.grantReadData(retroactiveCheckFn);
  alertsTopic.grantPublish(retroactiveCheckFn);

  addRoute(stack, stage, apigwv2.HttpMethod.GET, '/v1/cabinets', listCabinetsFn, { auth: 'jwt' });
  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/cabinets', createCabinetFn, { auth: 'jwt' });
  addRoute(stack, stage, apigwv2.HttpMethod.GET, '/v1/cabinets/{cabinetId}', getCabinetFn, { auth: 'jwt' });
  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/cabinets/{cabinetId}/medicines', addMedicineFn, {
    auth: 'jwt',
  });
  addRoute(
    stack,
    stage,
    apigwv2.HttpMethod.DELETE,
    '/v1/cabinets/{cabinetId}/medicines/{medId}',
    deleteMedicineFn,
    { auth: 'jwt' },
  );

  // docs/ALERTS.md "Retroactive check": stream INSERTs of MED# items only.
  // Batch size 100, bisect on error, max 3 retries, failures land on the shared DLQ.
  retroactiveCheckFn.addEventSource(
    new eventSources.DynamoEventSource(cabinetsTable, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 100,
      bisectBatchOnError: true,
      retryAttempts: 3,
      onFailure: new eventSources.SqsDlq(dlq),
      filters: [
        lambda.FilterCriteria.filter({
          eventName: lambda.FilterRule.isEqual('INSERT'),
          dynamodb: { Keys: { SK: { S: lambda.FilterRule.beginsWith('MED#') } } },
        }),
      ],
    }),
  );
}
