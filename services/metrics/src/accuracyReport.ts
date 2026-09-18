import { GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';
import { getS3 } from './env';
import { logger } from './observability';

/** The subset of tools/accuracy's `AccuracyReport` (docs/TESTING.md "Output") this dashboard
 * reads. Read loosely (no schema import from the `tools/` workspace) and defensively - a
 * missing or malformed report means "no accuracy run yet", never a 500. */
export interface AccuracyReportSummary {
  runId: string;
  generatedAt: string;
  sampleSize: number;
  tierCorrectnessRate?: number;
  byMethod: { method: string; count: number; batchExactRate: number }[];
  byCondition: { condition: string; value: string; count: number; batchExactRate: number }[];
  costPer1000ScansUsd?: number;
}

const ACCURACY_KEY = 'metrics/accuracy/latest.json';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Reads the last accuracy harness run E uploaded to the public bucket, or undefined if none exists yet. */
export async function readLatestAccuracyReport(bucket: string): Promise<AccuracyReportSummary | undefined> {
  try {
    const res = await getS3().send(new GetObjectCommand({ Bucket: bucket, Key: ACCURACY_KEY }));
    const text = await res.Body?.transformToString();
    if (!text) return undefined;
    const raw: unknown = JSON.parse(text);
    if (!isRecord(raw) || !isRecord(raw.summary)) return undefined;

    const summary = raw.summary;
    const byMethod = Array.isArray(summary.byMethod) ? (summary.byMethod as AccuracyReportSummary['byMethod']) : [];
    const byCondition = Array.isArray(summary.byCondition)
      ? (summary.byCondition as AccuracyReportSummary['byCondition'])
      : [];
    const tierCorrectness = isRecord(raw.tierCorrectness) ? raw.tierCorrectness : undefined;
    const cost = isRecord(raw.cost) ? raw.cost : undefined;

    return {
      runId: typeof raw.runId === 'string' ? raw.runId : 'unknown',
      generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : new Date(0).toISOString(),
      sampleSize: typeof summary.sampleSize === 'number' ? summary.sampleSize : 0,
      tierCorrectnessRate: typeof tierCorrectness?.rate === 'number' ? tierCorrectness.rate : undefined,
      byMethod,
      byCondition,
      costPer1000ScansUsd: typeof cost?.costPer1000ScansUsd === 'number' ? cost.costPer1000ScansUsd : undefined,
    };
  } catch (err) {
    if (err instanceof NoSuchKey) return undefined;
    logger.warn('failed to read latest accuracy report', { error: err instanceof Error ? err.message : String(err) });
    return undefined;
  }
}
