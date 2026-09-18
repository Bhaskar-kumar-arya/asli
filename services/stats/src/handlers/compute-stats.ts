import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { PublicStats } from '@asli/contracts';
import { computeImpactStats, type StatsInputRow } from '../compute';
import { getDdb, getS3, requireEnv } from '../db';
import { logger, metrics, MetricUnit } from '../observability';

const FLAGGED_BATCH_PROJECTION = 'alertMonth, mfgMonth, expMonth, reasonCode, reportingSource, category';

async function scanFlaggedBatchRows(tableName: string): Promise<StatsInputRow[]> {
  const ddb = getDdb();
  const rows: StatsInputRow[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const res = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: FLAGGED_BATCH_PROJECTION,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    for (const item of res.Items ?? []) {
      rows.push(item as StatsInputRow);
    }
    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return rows;
}

/** Counts CAB#.../META (cabinets) and CAB#.../MED#... (medicines) items in one pass. */
async function countCabinetItems(tableName: string): Promise<{ cabinets: number; medicines: number }> {
  const ddb = getDdb();
  let cabinets = 0;
  let medicines = 0;
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const res = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: 'SK',
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    for (const item of res.Items ?? []) {
      const sk = (item as { SK?: string }).SK ?? '';
      if (sk === 'META') cabinets += 1;
      else if (sk.startsWith('MED#')) medicines += 1;
    }
    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return { cabinets, medicines };
}

export interface ComputeStatsOutput {
  rows: number;
  months: number;
}

/**
 * Invoked by A2 after ingestion (services/ingestion/src/handlers/invoke-stats.ts)
 * and manually. Scans FlaggedBatches (paginated; docs says small table) and
 * Cabinets, writes impact-stats items to the shared Stats table
 * (PK STATS#IMPACT, SK ALL | <month> - see services/stats/src/types.ts for why
 * this isn't packages/contracts's StatsDocumentSchema), a cached STATS#PUBLIC/ALL
 * item matching the contract's PublicStatsSchema for the public API, and a JSON
 * summary to S3 for scripts/stats-report/export.ts to turn into tools/stats-report/latest.md.
 */
export async function handler(): Promise<ComputeStatsOutput> {
  const flaggedBatchesTable = requireEnv('FLAGGED_BATCHES_TABLE');
  const cabinetsTable = requireEnv('CABINETS_TABLE');
  const statsTable = requireEnv('STATS_TABLE');
  const rawBucket = requireEnv('RAW_BUCKET_NAME');

  const generatedAt = new Date().toISOString();
  const [rows, cabinetCounts] = await Promise.all([
    scanFlaggedBatchRows(flaggedBatchesTable),
    countCabinetItems(cabinetsTable),
  ]);

  const doc = computeImpactStats(rows, generatedAt);
  const ddb = getDdb();

  await ddb.send(
    new PutCommand({
      TableName: statsTable,
      Item: { PK: 'STATS#IMPACT', SK: 'ALL', generatedAt, document: doc.overall },
    }),
  );

  const months = Object.keys(doc.byMonth).sort();
  for (const month of months) {
    await ddb.send(
      new PutCommand({
        TableName: statsTable,
        Item: { PK: 'STATS#IMPACT', SK: month, generatedAt, document: doc.byMonth[month] },
      }),
    );
  }

  const latestMonth = months.at(-1) ?? generatedAt.slice(0, 7);
  const publicStats: PublicStats = {
    generatedAt,
    monthsCovered: months.length,
    latestMonth,
    totalFlaggedBatches: doc.overall.rows,
    cabinetsProtected: cabinetCounts.cabinets,
    medicinesTracked: cabinetCounts.medicines,
  };
  await ddb.send(
    new PutCommand({
      TableName: statsTable,
      Item: { PK: 'STATS#PUBLIC', SK: 'ALL', document: publicStats },
    }),
  );

  await getS3().send(
    new PutObjectCommand({
      Bucket: rawBucket,
      Key: 'stats/latest.json',
      Body: JSON.stringify({ ...doc, public: publicStats }, null, 2),
      ContentType: 'application/json',
    }),
  );

  logger.info('compute-stats done', { rows: rows.length, months: months.length });
  metrics.addMetric('StatsRowsScanned', MetricUnit.Count, rows.length);
  metrics.publishStoredMetrics();

  return { rows: rows.length, months: months.length };
}
