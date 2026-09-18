import * as path from 'node:path';
import { Stack, aws_apigatewayv2 as apigwv2, aws_dynamodb as dynamodb, aws_iam as iam, aws_s3 as s3, aws_ssm as ssm } from 'aws-cdk-lib';
import type { App } from 'aws-cdk-lib';
import { SSM_PATHS } from '@asli/contracts';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam, ssmName } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane N: pharmacy bulk-check API (docs/API.md POST /v1/pharmacy/checks, plan/tasks/N-pharmacy-mode.md).
 * One Lambda, shared HTTP API/JWT authorizer via addRoute. Reuses the uploads bucket and Bedrock
 * vision model lane C already wired for the supplier-invoice-photo path.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneNStack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  const flaggedBatchesTableName = importParam(stack, shared, SSM_PATHS.table('flagged-batches'));
  const ingestionStateTableName = importParam(stack, shared, SSM_PATHS.table('ingestion-state'));
  const referenceTableName = importParam(stack, shared, SSM_PATHS.table('reference'));
  const uploadsBucketName = importParam(stack, shared, SSM_PATHS.bucket('uploads'));
  const modelIdParamName = ssmName(shared, SSM_PATHS.bedrock.visionModelId);

  const flaggedBatchesTable = dynamodb.Table.fromTableAttributes(stack, 'FlaggedBatchesTable', {
    tableName: flaggedBatchesTableName,
    globalIndexes: ['GSI1', 'GSI2'],
  });
  const ingestionStateTable = dynamodb.Table.fromTableName(stack, 'IngestionStateTable', ingestionStateTableName);
  const referenceTable = dynamodb.Table.fromTableName(stack, 'ReferenceTable', referenceTableName);
  const uploadsBucket = s3.Bucket.fromBucketName(stack, 'UploadsBucket', uploadsBucketName);

  const entry = path.join(__dirname, '../../../services/pharmacy/src/checks/handler.ts');

  // ---- POST /v1/pharmacy/checks ----
  const pharmacyChecksFn = nodeFn(stack, 'PharmacyChecksHandler', {
    serviceName: 'pharmacy-checks',
    entry,
    environment: {
      FLAGGED_BATCHES_TABLE: flaggedBatchesTableName,
      INGESTION_STATE_TABLE: ingestionStateTableName,
      REFERENCE_TABLE: referenceTableName,
      UPLOADS_BUCKET: uploadsBucketName,
      BEDROCK_VISION_MODEL_ID_PARAM: modelIdParamName,
    },
  });
  flaggedBatchesTable.grantReadData(pharmacyChecksFn);
  ingestionStateTable.grantReadData(pharmacyChecksFn);
  referenceTable.grantReadWriteData(pharmacyChecksFn); // read: alias map/brand candidates; write: rate-limit counters
  uploadsBucket.grantRead(pharmacyChecksFn);
  uploadsBucket.grantDelete(pharmacyChecksFn); // invoice photos deleted immediately after extraction (docs/PRIVACY.md)
  pharmacyChecksFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      // Model id is read from SSM at runtime (T01/T02 Handoff), not known at synth time.
      resources: [`arn:aws:bedrock:${stack.region}::foundation-model/*`, `arn:aws:bedrock:${stack.region}:${stack.account}:inference-profile/*`],
    }),
  );
  pharmacyChecksFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [ssm.StringParameter.fromStringParameterName(stack, 'ModelIdParamRef', modelIdParamName).parameterArn],
    }),
  );
  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/pharmacy/checks', pharmacyChecksFn, { auth: 'jwt' });
}
