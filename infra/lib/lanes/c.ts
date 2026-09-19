import * as path from 'node:path';
import {
  Stack,
  aws_apigatewayv2 as apigwv2,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  aws_s3 as s3,
  aws_secretsmanager as secretsmanager,
  aws_ssm as ssm,
} from 'aws-cdk-lib';
import type { App } from 'aws-cdk-lib';
import { SSM_PATHS } from '@asli/contracts';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam, ssmName } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane C: upload, scan, check and alert-detail APIs (docs/API.md, docs/SCANNING.md).
 * One Lambda per route, all sharing the shared HTTP API/JWT authorizer via addRoute.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneCStack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  const flaggedBatchesTableName = importParam(stack, shared, SSM_PATHS.table('flagged-batches'));
  const ingestionStateTableName = importParam(stack, shared, SSM_PATHS.table('ingestion-state'));
  const referenceTableName = importParam(stack, shared, SSM_PATHS.table('reference'));
  const uploadsBucketName = importParam(stack, shared, SSM_PATHS.bucket('uploads'));
  const modelIdParamName = ssmName(shared, SSM_PATHS.bedrock.visionModelId);

  // Bedrock model access is account-gated and may or may not clear during the
  // event (submission/LEARNING_LOG.md). This lane-owned switch lets ops flip
  // scan extraction between backends with `aws ssm put-parameter --overwrite`,
  // no redeploy - see services/scan/src/scans/extraction-provider.ts. "gemini"
  // is the default: a user-provided free-tier key in Secrets Manager, better
  // read quality than the zero-dependency "textract" fallback, no Bedrock
  // account access required.
  const extractionProviderParamName = ssmName(stage, '/scan/extractionProvider');
  const extractionProviderParam = new ssm.StringParameter(stack, 'ExtractionProviderParam', {
    parameterName: extractionProviderParamName,
    stringValue: 'gemini',
    description: 'strip/bill extraction backend: "gemini" (default), "textract" (no external AI call), or "bedrock"',
  });

  const geminiModelIdParamName = ssmName(stage, '/scan/geminiModelId');
  const geminiModelIdParam = new ssm.StringParameter(stack, 'GeminiModelIdParam', {
    parameterName: geminiModelIdParamName,
    stringValue: 'gemini-3.5-flash-lite',
    description: 'Gemini model id for scan extraction - swap here if Google deprecates this one (see LEARNING_LOG.md)',
  });

  // Temporary, user-provided free-tier key (submission/LEARNING_LOG.md), created
  // out-of-band with `aws secretsmanager create-secret` - never in CDK/git.
  const geminiApiKeySecret = secretsmanager.Secret.fromSecretNameV2(stack, 'GeminiApiKeySecret', `asli/${stage}/gemini-api-key`);

  const flaggedBatchesTable = dynamodb.Table.fromTableAttributes(stack, 'FlaggedBatchesTable', {
    tableName: flaggedBatchesTableName,
    globalIndexes: ['GSI1', 'GSI2'],
  });
  const ingestionStateTable = dynamodb.Table.fromTableName(stack, 'IngestionStateTable', ingestionStateTableName);
  const referenceTable = dynamodb.Table.fromTableName(stack, 'ReferenceTable', referenceTableName);
  const uploadsBucket = s3.Bucket.fromBucketName(stack, 'UploadsBucket', uploadsBucketName);

  const commonEnv = {
    FLAGGED_BATCHES_TABLE: flaggedBatchesTableName,
    INGESTION_STATE_TABLE: ingestionStateTableName,
    REFERENCE_TABLE: referenceTableName,
  };
  const entry = (relPath: string): string => path.join(__dirname, '../../../services/scan/src', relPath);

  // ---- POST /v1/uploads ----
  const uploadsFn = nodeFn(stack, 'UploadsHandler', {
    serviceName: 'scan-uploads',
    entry: entry('uploads/handler.ts'),
    environment: { UPLOADS_BUCKET: uploadsBucketName },
  });
  uploadsBucket.grantPut(uploadsFn);
  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/uploads', uploadsFn, { auth: 'jwt' });

  // ---- POST /v1/checks ----
  const checksFn = nodeFn(stack, 'ChecksHandler', {
    serviceName: 'scan-checks',
    entry: entry('checks/handler.ts'),
    environment: commonEnv,
  });
  flaggedBatchesTable.grantReadData(checksFn);
  ingestionStateTable.grantReadData(checksFn);
  referenceTable.grantReadWriteData(checksFn); // read: alias map; write: rate-limit counters
  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/checks', checksFn, { auth: 'jwt' });

  // ---- POST /v1/scans ----
  const scansFn = nodeFn(stack, 'ScansHandler', {
    serviceName: 'scan-scans',
    entry: entry('scans/handler.ts'),
    environment: {
      ...commonEnv,
      UPLOADS_BUCKET: uploadsBucketName,
      BEDROCK_VISION_MODEL_ID_PARAM: modelIdParamName,
      EXTRACTION_PROVIDER_PARAM: extractionProviderParamName,
      GEMINI_MODEL_ID_PARAM: geminiModelIdParamName,
      GEMINI_API_KEY_SECRET_ARN: geminiApiKeySecret.secretArn,
    },
  });
  flaggedBatchesTable.grantReadData(scansFn);
  ingestionStateTable.grantReadData(scansFn);
  referenceTable.grantReadWriteData(scansFn);
  uploadsBucket.grantRead(scansFn);
  uploadsBucket.grantDelete(scansFn); // bill photos deleted immediately after extraction (docs/PRIVACY.md)
  // Both backends stay granted so flipping ExtractionProviderParam back to "bedrock" needs no redeploy.
  scansFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      // Model id is read from SSM at runtime (T02 Handoff), not known at synth time - scoped to the region, not a literal ARN.
      resources: [`arn:aws:bedrock:${stack.region}::foundation-model/*`, `arn:aws:bedrock:${stack.region}:${stack.account}:inference-profile/*`],
    }),
  );
  scansFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['textract:DetectDocumentText', 'textract:AnalyzeDocument'],
      resources: ['*'], // Textract has no resource-level ARNs to scope to
    }),
  );
  scansFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [
        ssm.StringParameter.fromStringParameterName(stack, 'ModelIdParamRef', modelIdParamName).parameterArn,
        extractionProviderParam.parameterArn,
        geminiModelIdParam.parameterArn,
      ],
    }),
  );
  geminiApiKeySecret.grantRead(scansFn);
  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/scans', scansFn, { auth: 'jwt' });

  // ---- GET /v1/alerts/{alertRef} ----
  const alertsFn = nodeFn(stack, 'AlertsHandler', {
    serviceName: 'scan-alerts',
    entry: entry('alerts/handler.ts'),
    environment: { FLAGGED_BATCHES_TABLE: flaggedBatchesTableName },
  });
  flaggedBatchesTable.grantReadData(alertsFn);
  addRoute(stack, stage, apigwv2.HttpMethod.GET, '/v1/alerts/{alertRef}', alertsFn, { auth: 'jwt' });
}
