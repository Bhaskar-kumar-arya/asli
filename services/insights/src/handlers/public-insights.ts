import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { InsightsResponseSchema, type Category, type ReasonCode } from '@asli/contracts';
import type { ImpactStats, ImpactStatsDocument, LagStats } from '@asli/stats';
import { getDdb, requireEnv } from '../db';
import { jsonResponse } from '../http';
import type { InsightsDetail } from '../types';

const ZERO_LAG: LagStats = { n: 0, mean: 0, median: 0, p10: 0, p90: 0, max: 0 };

function emptyDetail(): InsightsDetail {
  return {
    generatedAt: new Date().toISOString(),
    byCategory: {},
    byMonth: [],
    topReasonCodes: [],
    byMonthCategory: [],
    byReportingSource: [],
    withinExpiry: { rows: 0, withinExpiry: 0, missingExpiry: 0, withinExpiryShare: 0 },
    mfgToAlertLagMonths: ZERO_LAG,
    alertToExpiryRemainingMonths: ZERO_LAG,
  };
}

function toDetail(document: ImpactStatsDocument): InsightsDetail {
  const overall = document.overall;
  const monthEntries = Object.entries(document.byMonth).sort(([a], [b]) => a.localeCompare(b));

  const byCategory = {
    NSQ: overall.byCategory.NSQ ?? 0,
    SPURIOUS: overall.byCategory.SPURIOUS ?? 0,
  } as Record<Category, number>;

  const topReasonCodes = Object.entries(overall.byReasonCode)
    .map(([reasonCode, count]) => ({ reasonCode: reasonCode as ReasonCode, count }))
    .sort((a, b) => b.count - a.count);

  const summary = InsightsResponseSchema.parse({
    generatedAt: document.generatedAt,
    byCategory,
    byMonth: monthEntries.map(([month, stats]: [string, ImpactStats]) => ({ month, count: stats.rows })),
    topReasonCodes,
  });

  return {
    ...summary,
    byMonthCategory: monthEntries.map(([month, stats]: [string, ImpactStats]) => ({
      month,
      NSQ: stats.byCategory.NSQ ?? 0,
      SPURIOUS: stats.byCategory.SPURIOUS ?? 0,
    })),
    byReportingSource: Object.entries(overall.byReportingSource)
      .map(([reportingSource, count]) => ({ reportingSource, count }))
      .sort((a, b) => b.count - a.count),
    withinExpiry: {
      rows: overall.rows,
      withinExpiry: overall.withinExpiry,
      missingExpiry: overall.missingExpiry,
      withinExpiryShare: overall.withinExpiryShare,
    },
    mfgToAlertLagMonths: overall.mfgToAlertLagMonths,
    alertToExpiryRemainingMonths: overall.alertToExpiryRemainingMonths,
  };
}

/**
 * Lane S's compute-stats (services/stats/src/handlers/compute-stats.ts) writes the overall
 * stats under `STATS#IMPACT`/`ALL` (`document` = an `ImpactStats`, NOT a full
 * `ImpactStatsDocument`) and each month's stats as its own `STATS#IMPACT`/`<month>` item -
 * there is no single item with a nested `overall`/`byMonth` shape. This assembles the
 * `ImpactStatsDocument` this handler's own `toDetail` expects from those separate items
 * (fixed by X during the int integration pass, 2026-09-19 - a real `GET /v1/public/insights`
 * call against real backfilled data 500'd with "Cannot convert undefined or null to object"
 * because this handler previously read `STATS#IMPACT`/`ALL`'s `document` as if it already had
 * `byMonth` nested inside it).
 */
async function loadImpactStatsDocument(statsTable: string): Promise<ImpactStatsDocument | undefined> {
  const res = await getDdb().send(
    new QueryCommand({
      TableName: statsTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'STATS#IMPACT' },
    }),
  );
  const items = res.Items ?? [];
  const allItem = items.find((item) => item.SK === 'ALL');
  if (!allItem) return undefined;

  const byMonth: Record<string, ImpactStats> = {};
  for (const item of items) {
    if (item.SK === 'ALL') continue;
    byMonth[item.SK as string] = item.document as ImpactStats;
  }

  return { generatedAt: allItem.generatedAt as string, overall: allItem.document as ImpactStats, byMonth };
}

/** GET /v1/public/insights (docs/API.md, public - no JWT authorizer attached). */
export async function handler(): Promise<APIGatewayProxyStructuredResultV2> {
  const statsTable = requireEnv('STATS_TABLE');
  const document = await loadImpactStatsDocument(statsTable);
  return jsonResponse(200, document ? toDetail(document) : emptyDetail());
}
