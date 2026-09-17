import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SSMClient } from '@aws-sdk/client-ssm';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ScanRequestSchema } from '@asli/contracts';
import type { ExtractedItem, ScanResponse, ScanWarning } from '@asli/contracts';
import { createLookup } from '@asli/lookup';
import type { AliasMap } from '@asli/matching';
import { checkIdentity } from '../check-item';
import { ApiError, jsonResponse, parseJsonBody, requireUserId, withErrorHandling } from '../http';
import { logEvent } from '../logging';
import { metrics, recordExtractionFailed, recordScanLatency } from '../metrics';
import { checkAndIncrement, RateLimitedError } from '../rate-limit/limiter';
import { createAliasMapLoader } from '../reference/alias-map';
import { getBrandCandidates } from '../reference/brand-candidates';
import { buildUploadKey } from '../uploads/presign';
import { extractBill, extractStrip } from './bedrock-client';
import { createModelIdLoader } from './model-id';
import { processBillExtraction, processStripExtraction } from './post-process';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({});
const ssmClient = new SSMClient({});

const flaggedBatchesTable = process.env.FLAGGED_BATCHES_TABLE;
const ingestionStateTable = process.env.INGESTION_STATE_TABLE;
const referenceTable = process.env.REFERENCE_TABLE;
const uploadsBucket = process.env.UPLOADS_BUCKET;
const modelIdParam = process.env.BEDROCK_VISION_MODEL_ID_PARAM;

/** docs/API.md rate limit: 30 scans/hour per user. */
const SCANS_PER_HOUR = 30;

let loadAliases: (() => Promise<AliasMap>) | undefined;
let loadModelId: (() => Promise<string>) | undefined;

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  const startedAt = Date.now();
  return withErrorHandling(event, async () => {
    if (!flaggedBatchesTable || !ingestionStateTable || !referenceTable || !uploadsBucket || !modelIdParam) {
      throw new Error(
        'FLAGGED_BATCHES_TABLE, INGESTION_STATE_TABLE, REFERENCE_TABLE, UPLOADS_BUCKET and BEDROCK_VISION_MODEL_ID_PARAM env vars are required',
      );
    }
    const userId = requireUserId(event);
    const body = ScanRequestSchema.parse(parseJsonBody(event));

    try {
      await checkAndIncrement({ ddb, referenceTable }, userId, 'scans', SCANS_PER_HOUR);
    } catch (err) {
      if (err instanceof RateLimitedError) throw new ApiError('RATE_LIMITED', 'too many scans this hour');
      throw err;
    }

    const key = buildUploadKey(body.kind, userId, body.uploadId);
    const object = await s3Client.send(new GetObjectCommand({ Bucket: uploadsBucket, Key: key }));
    const contentType = object.ContentType ?? 'application/octet-stream';
    const imageBytes = (await object.Body?.transformToByteArray()) ?? new Uint8Array();

    loadModelId ??= createModelIdLoader(ssmClient, modelIdParam);
    const bedrockDeps = { bedrockClient, modelId: await loadModelId() };
    const processed =
      body.kind === 'strip'
        ? processStripExtraction(await extractStrip(bedrockDeps, imageBytes, contentType))
        : processBillExtraction(await extractBill(bedrockDeps, imageBytes, contentType));

    if (body.kind === 'bill') {
      // docs/PRIVACY.md: bill photos are deleted immediately after extraction, success or failure.
      await s3Client.send(new DeleteObjectCommand({ Bucket: uploadsBucket, Key: key }));
    }
    if (processed.items.length === 0 && processed.warnings.includes('NO_BATCH_ON_LINE') && !processed.warnings.includes('NOT_A_MEDICINE')) {
      recordExtractionFailed();
    }

    const lookup = createLookup({ ddb, flaggedBatchesTable, ingestionStateTable });
    loadAliases ??= createAliasMapLoader({ ddb, referenceTable });
    const aliases = await loadAliases();

    const items: ExtractedItem[] = processed.items.map((p) => p.identity);
    const results = await Promise.all(
      processed.items.map(async (p) => {
        const brandCandidates = p.brandQuery ? await getBrandCandidates(ddb, referenceTable, p.brandQuery) : undefined;
        return checkIdentity(p.identity, { lookup, aliases }, brandCandidates);
      }),
    );

    const response: ScanResponse = {
      scanId: randomUUID(),
      method: body.kind === 'strip' ? 'strip_vision' : 'bill_vision',
      items,
      results,
      warnings: processed.warnings as ScanWarning[],
    };

    recordScanLatency(Date.now() - startedAt);
    metrics.publishStoredMetrics();
    logEvent('scan completed', {
      requestId: event.requestContext.requestId,
      route: 'scans',
      kind: body.kind,
      scanId: response.scanId,
      itemCount: items.length,
      durationMs: Date.now() - startedAt,
    });

    return jsonResponse(200, response);
  });
}
