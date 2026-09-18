import * as path from 'node:path';
import { SSM_PATHS } from '@asli/contracts';
import {
  Duration,
  Stack,
  aws_apigatewayv2 as apigwv2,
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  aws_ssm as ssm,
  type App,
} from 'aws-cdk-lib';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam, ssmName } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane S: statistics job (docs/PRODUCT.md "Evidence") and public stats API
 * (docs/API.md `GET /v1/public/stats`). `computeStats` scans FlaggedBatches
 * (paginated - small table) and Cabinets, writes impact-stats items to the
 * shared Stats table, and publishes its own function ARN to
 * `/asli/<stage>/lambda/statsJobArn` for A2's invoke-stats step
 * (services/ingestion/src/handlers/invoke-stats.ts) to call after ingestion.
 *
 * Contract gap (this task's Handoff "Contract change requests"): the impact
 * numbers this lane computes (lag/within-expiry distributions, counts by
 * reasonCode/reportingSource) don't fit `@asli/contracts`'s StatsDocumentSchema,
 * which is shaped for operational/cost metrics (ingestion/scans/matching/alerts/
 * cost, see packages/contracts/fixtures/stats.json). This lane writes its own
 * document shape (services/stats/src/types.ts) to Stats table items under
 * PK STATS#IMPACT instead, plus a STATS#PUBLIC/ALL cache of the contract's
 * PublicStatsSchema that the public API just re-serves.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneSStack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  const flaggedBatchesTableName = importParam(stack, shared, SSM_PATHS.table('flagged-batches'));
  const flaggedBatchesTable = dynamodb.Table.fromTableName(stack, 'FlaggedBatchesTable', flaggedBatchesTableName);

  const cabinetsTableName = importParam(stack, shared, SSM_PATHS.table('cabinets'));
  const cabinetsTable = dynamodb.Table.fromTableName(stack, 'CabinetsTable', cabinetsTableName);

  const statsTableName = importParam(stack, shared, SSM_PATHS.table('stats'));
  const statsTable = dynamodb.Table.fromTableName(stack, 'StatsTable', statsTableName);

  const rawBucketName = importParam(stack, shared, SSM_PATHS.bucket('raw'));
  const rawBucket = s3.Bucket.fromBucketName(stack, 'RawBucket', rawBucketName);

  const entry = (file: string) => path.join(__dirname, '../../../services/stats/src', file);

  const computeStatsFn = nodeFn(stack, 'ComputeStatsHandler', {
    serviceName: 's-compute-stats',
    entry: entry('handlers/compute-stats.ts'),
    environment: {
      FLAGGED_BATCHES_TABLE: flaggedBatchesTableName,
      CABINETS_TABLE: cabinetsTableName,
      STATS_TABLE: statsTableName,
      RAW_BUCKET_NAME: rawBucketName,
    },
    timeout: Duration.seconds(90),
  });
  flaggedBatchesTable.grantReadData(computeStatsFn);
  cabinetsTable.grantReadData(computeStatsFn);
  statsTable.grantReadWriteData(computeStatsFn);
  rawBucket.grantWrite(computeStatsFn);

  new ssm.StringParameter(stack, 'StatsJobArnParam', {
    parameterName: ssmName(stage, '/lambda/statsJobArn'),
    stringValue: computeStatsFn.functionArn,
  });

  const publicStatsFn = nodeFn(stack, 'PublicStatsHandler', {
    serviceName: 's-public-stats',
    entry: entry('handlers/public-stats.ts'),
    environment: { STATS_TABLE: statsTableName },
  });
  statsTable.grantReadData(publicStatsFn);

  addRoute(stack, stage, apigwv2.HttpMethod.GET, '/v1/public/stats', publicStatsFn, { auth: 'public' });
}
