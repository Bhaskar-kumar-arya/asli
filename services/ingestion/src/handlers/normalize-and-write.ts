import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import {
  FlaggedBatchSchema,
  flaggedBatchGsi1Pk,
  flaggedBatchGsi1Sk,
  flaggedBatchGsi2Pk,
  flaggedBatchGsi2Sk,
  flaggedBatchPk,
  flaggedBatchSk,
  type FlaggedBatch,
} from '@asli/contracts';
import { normalizeRows, type ParsedRow } from '../cdsco';
import { createBedrockReasonClassifier } from '../lib/reason-classifier-bedrock';
import { requireEnv } from '../lib/env';
import type { FetchedWork, NormalizedWork } from './types';

const s3 = new S3Client({});
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({});

async function readParsedRows(bucketName: string, key: string): Promise<ParsedRow[]> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
  const text = await res.Body?.transformToString();
  if (!text) throw new Error(`normalize-and-write: ${key} is empty`);
  return JSON.parse(text) as ParsedRow[];
}

/** Conditional put so a rerun of the same month is a no-op (docs/DATA_MODEL.md, acceptance criterion). */
async function putIfNew(tableName: string, item: Record<string, unknown>): Promise<'written' | 'collision'> {
  try {
    await doc.send(
      new PutCommand({ TableName: tableName, Item: item, ConditionExpression: 'attribute_not_exists(PK)' }),
    );
    return 'written';
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return 'collision';
    }
    throw err;
  }
}

function keyedItem(batch: FlaggedBatch): Record<string, unknown> {
  return {
    ...batch,
    PK: flaggedBatchPk(batch.batchNorm),
    SK: flaggedBatchSk(batch.alertMonth, batch.category, batch.rowHash),
    GSI1PK: flaggedBatchGsi1Pk(batch.batchSkeleton),
    GSI1SK: flaggedBatchGsi1Sk(batch.alertMonth, batch.rowHash),
    GSI2PK: flaggedBatchGsi2Pk(batch.alertMonth),
    GSI2SK: flaggedBatchGsi2Sk(batch.category, batch.rowHash),
  };
}

export async function handler(event: FetchedWork): Promise<NormalizedWork> {
  const flaggedBatchesTable = requireEnv('FLAGGED_BATCHES_TABLE');
  const referenceTable = requireEnv('REFERENCE_TABLE');
  const bedrockModelId = requireEnv('BEDROCK_TEXT_MODEL_ID');
  const rawBucketName = requireEnv('RAW_BUCKET_NAME');

  const metrics = new Metrics({ namespace: 'Asli' });

  const rows = await readParsedRows(rawBucketName, event.parsedRowsKey);
  const reasonClassifier = createBedrockReasonClassifier({
    bedrock,
    doc,
    referenceTableName: referenceTable,
    modelId: bedrockModelId,
    metrics,
  });

  // No `aliases` dep here on purpose: manufacturerNorm feeds rowHash
  // (docs/DATA_SOURCES.md §4), so if it depended on Reference's alias table -
  // which build-reference keeps growing after every ingestion (this task's
  // Deliverable 7) - the SAME CDSCO row would hash differently across reruns
  // as new aliases appeared, breaking "rerun produces zero new items"
  // (verified against a real duplicate on dev-a2 - see this task's Handoff).
  // Matching-time alias resolution already covers this: packages/matching's
  // classifyMatch applies ctx.aliases to the *identity* side and falls back
  // to manufacturerSimilarity for near matches, so an unaliased, stable
  // manufacturerNorm on FlaggedBatches doesn't weaken matching.
  const batches = await normalizeRows(rows, { reasonClassifier });

  let writtenCount = 0;
  let collisionCount = 0;
  for (const batch of batches) {
    // demo:false is A1's normalizeRows default (it never sees the demo flag);
    // FIXTURE-sourced rows are tagged here instead (docs/ALERTS.md).
    const taggedBatch = FlaggedBatchSchema.parse({ ...batch, demo: event.demo });
    const outcome = await putIfNew(flaggedBatchesTable, keyedItem(taggedBatch));
    if (outcome === 'written') writtenCount += 1;
    else collisionCount += 1;
  }

  metrics.addDimension('category', event.category);
  metrics.addDimension('sourceType', event.sourceType);
  metrics.addMetric('IngestedRows', MetricUnit.Count, writtenCount);
  metrics.addMetric('BatchCollisionIgnored', MetricUnit.Count, collisionCount);
  metrics.publishStoredMetrics();

  return {
    month: event.month,
    tab: event.tab,
    sourceType: event.sourceType,
    fixtureKey: event.fixtureKey,
    category: event.category,
    alertMonth: event.alertMonth,
    snapshotKey: event.snapshotKey,
    writtenCount,
    collisionCount,
    skippedCount: rows.length - batches.length,
  };
}
