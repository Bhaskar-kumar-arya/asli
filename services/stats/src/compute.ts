import type { ImpactStats, ImpactStatsDocument, LagStats } from './types';

/** Fields of a FlaggedBatch row this lane needs (docs/DATA_SOURCES.md §4). */
export interface StatsInputRow {
  alertMonth: string;
  mfgMonth: string | null;
  expMonth: string | null;
  reasonCode: string;
  reportingSource: string;
  category: string;
}

/** Whole months from `fromYyyyMm` to `toYyyyMm` (can be negative). */
export function monthsBetween(fromYyyyMm: string, toYyyyMm: string): number {
  const [fy, fm] = fromYyyyMm.split('-').map(Number);
  const [ty, tm] = toYyyyMm.split('-').map(Number);
  return (ty! - fy!) * 12 + (tm! - fm!);
}

/** Linear-interpolated percentile of an ascending-sorted array. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo]!;
  const frac = rank - lo;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * frac;
}

function lagStatsOf(values: number[]): LagStats {
  const n = values.length;
  if (n === 0) return { n: 0, mean: 0, median: 0, p10: 0, p90: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
  return {
    n,
    mean,
    median: percentile(sorted, 50),
    p10: percentile(sorted, 10),
    p90: percentile(sorted, 90),
    max: sorted[n - 1]!,
  };
}

function count(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function computeGroup(rows: StatsInputRow[]): ImpactStats {
  let withinExpiry = 0;
  let missingExpiry = 0;
  let missingMfgMonth = 0;
  const lagValues: number[] = [];
  const remainingValues: number[] = [];
  const byReasonCode: Record<string, number> = {};
  const byReportingSource: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const row of rows) {
    count(byReasonCode, row.reasonCode);
    count(byReportingSource, row.reportingSource);
    count(byCategory, row.category);

    if (row.expMonth) {
      if (row.expMonth >= row.alertMonth) withinExpiry += 1;
      remainingValues.push(monthsBetween(row.alertMonth, row.expMonth));
    } else {
      missingExpiry += 1;
    }

    if (row.mfgMonth) {
      lagValues.push(monthsBetween(row.mfgMonth, row.alertMonth));
    } else {
      missingMfgMonth += 1;
    }
  }

  const withExpiryKnown = rows.length - missingExpiry;
  return {
    rows: rows.length,
    withinExpiry,
    missingExpiry,
    withinExpiryShare: withExpiryKnown > 0 ? withinExpiry / withExpiryKnown : 0,
    mfgToAlertLagMonths: lagStatsOf(lagValues),
    missingMfgMonth,
    alertToExpiryRemainingMonths: lagStatsOf(remainingValues),
    byReasonCode,
    byReportingSource,
    byCategory,
  };
}

/** docs/PRODUCT.md "Evidence" / this lane's task Deliverable 1. */
export function computeImpactStats(rows: StatsInputRow[], generatedAt: string): ImpactStatsDocument {
  const overall = computeGroup(rows);

  const rowsByMonth = new Map<string, StatsInputRow[]>();
  for (const row of rows) {
    const list = rowsByMonth.get(row.alertMonth) ?? [];
    list.push(row);
    rowsByMonth.set(row.alertMonth, list);
  }

  const byMonth: Record<string, ImpactStats> = {};
  for (const [month, monthRows] of rowsByMonth) {
    byMonth[month] = computeGroup(monthRows);
  }

  return { generatedAt, overall, byMonth };
}
