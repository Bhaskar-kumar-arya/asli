import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { MetricsSummarySchema, PRICING_TABLE } from '@asli/contracts';
import { readLatestAccuracyReport } from '../accuracyReport';
import { fetchMeasuredUsage } from '../cloudwatch';
import { computeCostPerIngestionRun, computeCostPerScan, computeTenThousandFamilyProjection } from '../cost';
import { requireEnv } from '../env';
import { jsonResponse } from '../http';

/**
 * GET /v1/public/metrics (docs/API.md, public - no JWT authorizer attached).
 *
 * Returns the frozen contract shape (`MetricsSummary`) plus a superset of extra fields the
 * `/dashboard` page (apps/web/src/features/dashboard) reads: accuracy broken down by method and
 * condition, and the full cost breakdown (per scan, per 1,000 scans, per ingestion run, and the
 * 10,000-family projection with its stated assumptions - docs/OBSERVABILITY_AND_COST.md). These
 * extra fields aren't in `@asli/contracts` yet (see this task's Handoff "Contract change
 * requests") so callers that only read `MetricsSummary`'s documented fields are unaffected.
 */
export async function handler(): Promise<APIGatewayProxyStructuredResultV2> {
  const stage = requireEnv('STAGE');
  const publicBucket = requireEnv('PUBLIC_BUCKET_NAME');

  const [usage, accuracy] = await Promise.all([fetchMeasuredUsage(stage), readLatestAccuracyReport(publicBucket)]);

  const costPerScan = computeCostPerScan(PRICING_TABLE, usage);
  const costPerIngestionRun = computeCostPerIngestionRun(PRICING_TABLE, usage);
  const projection = computeTenThousandFamilyProjection(PRICING_TABLE, costPerScan);

  const measuredAt = usage.windowEnd;

  const summary = MetricsSummarySchema.parse({
    accuracy: {
      sampleSize: accuracy?.sampleSize ?? 0,
      measuredAt: accuracy?.generatedAt,
    },
    cost: {
      costPer1000ScansUsd: costPerScan.totalUsd !== undefined ? costPerScan.totalUsd * 1000 : undefined,
      measuredAt,
    },
  });

  return jsonResponse(200, {
    ...summary,
    accuracyDetail: accuracy
      ? {
          runId: accuracy.runId,
          measuredAt: accuracy.generatedAt,
          tierCorrectnessRate: accuracy.tierCorrectnessRate,
          byMethod: accuracy.byMethod,
          byCondition: accuracy.byCondition,
        }
      : undefined,
    costDetail: {
      window: { start: usage.windowStart, end: usage.windowEnd },
      scanCount: usage.scanCount,
      perScanUsd: costPerScan,
      perIngestionRun: costPerIngestionRun,
      tenThousandFamilyProjection: projection,
    },
  });
}
