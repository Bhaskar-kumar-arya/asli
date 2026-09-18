import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SSMClient } from '@aws-sdk/client-ssm';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { PharmacyCheckRequestSchema } from '@asli/contracts';
import type { PharmacyCheckResponse } from '@asli/contracts';
import { createLookup } from '@asli/lookup';
import type { AliasMap } from '@asli/matching';
// Reuses lane C's bill extraction pipeline by import (plan/tasks/N-pharmacy-mode.md) rather than
// re-implementing Bedrock vision extraction for the supplier-invoice-photo path.
import { checkIdentity } from '@asli/scan/src/check-item';
import { extractBill } from '@asli/scan/src/scans/bedrock-client';
import { createModelIdLoader } from '@asli/scan/src/scans/model-id';
import { processBillExtraction } from '@asli/scan/src/scans/post-process';
import { createAliasMapLoader } from '@asli/scan/src/reference/alias-map';
import { getBrandCandidates } from '@asli/scan/src/reference/brand-candidates';
import { buildUploadKey } from '@asli/scan/src/uploads/presign';
import { parsePharmacyCsv } from '../csv';
import { ApiError, jsonResponse, parseJsonBody, requireUserId, withErrorHandling } from '../http';
import { logEvent } from '../logging';
import { metrics, recordPharmacyCheckLatency, recordPharmacyFlaggedUnits, recordPharmacyRowCount } from '../metrics';
import { checkAndIncrement, RateLimitedError } from '../rate-limit/limiter';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({});
const ssmClient = new SSMClient({});

const flaggedBatchesTable = process.env.FLAGGED_BATCHES_TABLE;
const ingestionStateTable = process.env.INGESTION_STATE_TABLE;
const referenceTable = process.env.REFERENCE_TABLE;
const uploadsBucket = process.env.UPLOADS_BUCKET;
const modelIdParam = process.env.BEDROCK_VISION_MODEL_ID_PARAM;

/** docs/API.md rate limit: 10 pharmacy checks/hour per user. */
const PHARMACY_CHECKS_PER_HOUR = 10;

let loadAliases: (() => Promise<AliasMap>) | undefined;
let loadModelId: (() => Promise<string>) | undefined;

interface PendingRow {
  identity: Parameters<typeof checkIdentity>[0];
  brandQuery?: string;
}

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  const startedAt = Date.now();
  return withErrorHandling(event, async () => {
    if (!flaggedBatchesTable || !ingestionStateTable || !referenceTable || !uploadsBucket || !modelIdParam) {
      throw new Error(
        'FLAGGED_BATCHES_TABLE, INGESTION_STATE_TABLE, REFERENCE_TABLE, UPLOADS_BUCKET and BEDROCK_VISION_MODEL_ID_PARAM env vars are required',
      );
    }
    const userId = requireUserId(event);
    const body = PharmacyCheckRequestSchema.parse(parseJsonBody(event));

    try {
      await checkAndIncrement({ ddb, referenceTable }, userId, 'pharmacy', PHARMACY_CHECKS_PER_HOUR);
    } catch (err) {
      if (err instanceof RateLimitedError) throw new ApiError('RATE_LIMITED', 'too many pharmacy checks this hour');
      throw err;
    }

    const pending: PendingRow[] = 'csv' in body ? parsePharmacyCsv(body.csv) : await extractFromPhoto(userId, body.uploadId);

    if (pending.length === 0) {
      throw new ApiError('BAD_REQUEST', 'no rows with a batch number were found');
    }

    const lookup = createLookup({ ddb, flaggedBatchesTable, ingestionStateTable });
    loadAliases ??= createAliasMapLoader({ ddb, referenceTable });
    const aliases = await loadAliases();

    const results = await Promise.all(
      pending.map(async (row) => {
        const brandCandidates = row.brandQuery ? await getBrandCandidates(ddb, referenceTable, row.brandQuery) : undefined;
        const result = await checkIdentity(row.identity, { lookup, aliases }, brandCandidates);
        return { ...result, quantity: row.identity.quantity };
      }),
    );

    const flaggedUnits = results
      .filter((row) => row.tier === 'FLAGGED')
      .reduce((sum, row) => sum + (row.quantity ?? 1), 0);

    const response: PharmacyCheckResponse = { rows: results, flaggedUnits };

    recordPharmacyRowCount(results.length);
    recordPharmacyFlaggedUnits(flaggedUnits);
    recordPharmacyCheckLatency(Date.now() - startedAt);
    metrics.publishStoredMetrics();

    logEvent('pharmacy check completed', {
      requestId: event.requestContext.requestId,
      route: 'pharmacy-checks',
      rowCount: results.length,
      flaggedUnits,
      durationMs: Date.now() - startedAt,
    });

    return jsonResponse(200, response);
  });
}

/** Supplier invoice photo path: same Bedrock bill-extraction pipeline as docs/SCANNING.md's bill scan. */
async function extractFromPhoto(userId: string, uploadId: string): Promise<PendingRow[]> {
  const key = buildUploadKey('pharmacy', userId, uploadId);
  const object = await s3Client.send(new GetObjectCommand({ Bucket: uploadsBucket, Key: key }));
  const contentType = object.ContentType ?? 'application/octet-stream';
  const imageBytes = (await object.Body?.transformToByteArray()) ?? new Uint8Array();

  loadModelId ??= createModelIdLoader(ssmClient, modelIdParam as string);
  const extraction = await extractBill({ bedrockClient, modelId: await loadModelId() }, imageBytes, contentType);

  // docs/PRIVACY.md: invoice photos are deleted immediately after extraction, success or failure.
  await s3Client.send(new DeleteObjectCommand({ Bucket: uploadsBucket, Key: key }));

  if (!extraction) {
    throw new ApiError('EXTRACTION_FAILED', 'could not read the invoice photo');
  }

  const processed = processBillExtraction(extraction);
  return processed.items;
}
