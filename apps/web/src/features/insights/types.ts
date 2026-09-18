import type { InsightsResponse } from '@asli/contracts';

/**
 * `GET /v1/public/insights` returns the frozen `InsightsResponse` contract fields plus a
 * superset of chart-only detail (services/insights/src/handlers/public-insights.ts) that
 * isn't in `@asli/contracts` yet - see plan/tasks/M-insights.md Handoff "Contract change
 * requests". This type documents that superset for the `/insights` page only; any other
 * caller should keep reading just `InsightsResponse`'s documented fields.
 */
export interface LagStats {
  n: number;
  mean: number;
  median: number;
  p10: number;
  p90: number;
  max: number;
}

export interface InsightsDetail extends InsightsResponse {
  byMonthCategory: { month: string; NSQ: number; SPURIOUS: number }[];
  byReportingSource: { reportingSource: string; count: number }[];
  withinExpiry: {
    rows: number;
    withinExpiry: number;
    missingExpiry: number;
    withinExpiryShare: number;
  };
  mfgToAlertLagMonths: LagStats;
  alertToExpiryRemainingMonths: LagStats;
}
