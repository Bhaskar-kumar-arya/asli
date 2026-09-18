import type { InsightsResponse } from '@asli/contracts';
import type { LagStats } from '@asli/stats';

/**
 * `GET /v1/public/insights` returns the frozen `InsightsResponse` contract fields
 * (generatedAt, byCategory, byMonth, topReasonCodes) plus a superset of chart-only
 * detail the `/insights` page (apps/web/src/features/insights) reads: the NSQ/SPURIOUS
 * split per month, counts by reporting source, and the lag/within-expiry distributions
 * lane S already computes into `ImpactStatsDocument` (services/stats/src/types.ts).
 * These extra fields aren't in `@asli/contracts` yet - see this task's Handoff
 * "Contract change requests". Callers that only read `InsightsResponse`'s documented
 * fields are unaffected.
 */
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
