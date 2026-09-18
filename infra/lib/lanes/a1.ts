import * as path from 'node:path';
import { Stack, aws_s3 as s3 } from 'aws-cdk-lib';
import type { App } from 'aws-cdk-lib';
import { SSM_PATHS } from '@asli/contracts';
import { cdkEnv, sharedStage, stackName } from '../stage';
import { nodeFn } from '../node-fn';
import { importParam } from '../ssm';

/**
 * Lane A1: test Lambda proving services/ingestion's CDSCO client works from
 * inside Lambda (acceptance criterion) - fetches one month and writes the raw
 * snapshot to the shared raw bucket. Not the real ingestion pipeline (A2 owns
 * Step Functions + DynamoDB writes).
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneA1Stack', stage), { env: cdkEnv() });

  const rawBucketName = importParam(stack, sharedStage(), SSM_PATHS.bucket('raw'));
  const rawBucket = s3.Bucket.fromBucketName(stack, 'RawBucket', rawBucketName);

  const fn = nodeFn(stack, 'FetchMonthHandler', {
    serviceName: 'a1-cdsco-fetch-month',
    entry: path.join(__dirname, '../../../services/ingestion/src/handler.ts'),
    environment: { BUCKET_NAME: rawBucketName },
  });

  rawBucket.grantPut(fn);
}
