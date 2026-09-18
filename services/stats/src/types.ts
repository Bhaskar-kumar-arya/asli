/**
 * Impact-statistics document shape (docs/PRODUCT.md "Evidence", this lane's task
 * Deliverable 1). Deliberately NOT `StatsDocumentSchema` from `@asli/contracts` -
 * that schema is shaped for operational/cost metrics (ingestion/scans/matching/
 * alerts/cost) that this lane's FlaggedBatches-only scan can't populate. See this
 * task's Handoff "Contract change requests".
 */
export interface LagStats {
  /** Rows with a known date for this distribution. */
  n: number;
  mean: number;
  median: number;
  p10: number;
  p90: number;
  max: number;
}

export interface ImpactStats {
  rows: number;
  withinExpiry: number;
  /** Rows with no expMonth, excluded from withinExpiryShare's denominator. */
  missingExpiry: number;
  withinExpiryShare: number;
  /** Months from mfgMonth to alertMonth, rows with a known mfgMonth only. */
  mfgToAlertLagMonths: LagStats;
  /** Rows with no mfgMonth, excluded from mfgToAlertLagMonths. */
  missingMfgMonth: number;
  /** Months remaining from alertMonth to expMonth, rows with a known expMonth only. */
  alertToExpiryRemainingMonths: LagStats;
  byReasonCode: Record<string, number>;
  byReportingSource: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface ImpactStatsDocument {
  generatedAt: string;
  overall: ImpactStats;
  /** Keyed by alertMonth (YYYY-MM). */
  byMonth: Record<string, ImpactStats>;
}
