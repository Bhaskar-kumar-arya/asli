import { describe, expect, it } from 'vitest';
import { computeImpactStats, monthsBetween, percentile, type StatsInputRow } from './compute';

describe('monthsBetween', () => {
  it('counts whole months forward', () => {
    expect(monthsBetween('2024-01', '2024-11')).toBe(10);
  });
  it('counts across year boundaries', () => {
    expect(monthsBetween('2024-06', '2025-03')).toBe(9);
  });
  it('is negative when to precedes from', () => {
    expect(monthsBetween('2025-03', '2025-01')).toBe(-2);
  });
});

describe('percentile', () => {
  it('interpolates within a sorted array', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(sorted, 50)).toBeCloseTo(5.5);
    expect(percentile(sorted, 0)).toBe(1);
    expect(percentile(sorted, 100)).toBe(10);
  });
  it('handles empty and single-element arrays', () => {
    expect(percentile([], 50)).toBe(0);
    expect(percentile([7], 90)).toBe(7);
  });
});

function row(partial: Partial<StatsInputRow> & { alertMonth: string }): StatsInputRow {
  return {
    mfgMonth: null,
    expMonth: null,
    reasonCode: 'ASSAY',
    reportingSource: 'CENTRAL_LAB',
    category: 'NSQ',
    ...partial,
  };
}

describe('computeImpactStats', () => {
  it('matches a hand-checked-shape fixture: within-expiry share, one missing row excluded', () => {
    // Mirrors the shape of docs/PRODUCT.md's hand-checked Sep-2024 central-lab
    // figures (49 rows, 48 within expiry) without claiming to BE that dataset -
    // this lane has no real backfilled data yet (see task Handoff).
    const rows: StatsInputRow[] = [];
    for (let i = 0; i < 48; i++) {
      rows.push(row({ alertMonth: '2024-09', mfgMonth: '2023-10', expMonth: '2025-09' }));
    }
    // One row already expired at announcement.
    rows.push(row({ alertMonth: '2024-09', mfgMonth: '2022-01', expMonth: '2024-08' }));

    const doc = computeImpactStats(rows, '2026-09-18T00:00:00.000Z');
    const month = doc.byMonth['2024-09']!;
    expect(month.rows).toBe(49);
    expect(month.withinExpiry).toBe(48);
    expect(month.missingExpiry).toBe(0);
    expect(month.withinExpiryShare).toBeCloseTo(48 / 49);
    expect(month.mfgToAlertLagMonths.n).toBe(49);
    expect(month.mfgToAlertLagMonths.max).toBe(monthsBetween('2022-01', '2024-09'));
  });

  it('excludes rows with missing dates from lag/expiry stats but counts them', () => {
    const rows: StatsInputRow[] = [
      row({ alertMonth: '2025-01', mfgMonth: '2024-01', expMonth: '2026-01' }),
      row({ alertMonth: '2025-01', mfgMonth: null, expMonth: '2026-06' }),
      row({ alertMonth: '2025-01', mfgMonth: '2024-06', expMonth: null }),
    ];

    const doc = computeImpactStats(rows, '2026-09-18T00:00:00.000Z');
    expect(doc.overall.rows).toBe(3);
    expect(doc.overall.missingMfgMonth).toBe(1);
    expect(doc.overall.mfgToAlertLagMonths.n).toBe(2);
    expect(doc.overall.missingExpiry).toBe(1);
    expect(doc.overall.alertToExpiryRemainingMonths.n).toBe(2);
    expect(doc.overall.withinExpiryShare).toBeCloseTo(1); // 2 known, both within expiry
  });

  it('treats a batch expiring in the alert month itself as within expiry', () => {
    const rows: StatsInputRow[] = [row({ alertMonth: '2025-03', expMonth: '2025-03' })];
    const doc = computeImpactStats(rows, '2026-09-18T00:00:00.000Z');
    expect(doc.overall.withinExpiry).toBe(1);
  });

  it('buckets counts by reasonCode, reportingSource and category', () => {
    const rows: StatsInputRow[] = [
      row({ alertMonth: '2025-03', reasonCode: 'ASSAY', reportingSource: 'CENTRAL_LAB', category: 'NSQ' }),
      row({ alertMonth: '2025-03', reasonCode: 'ASSAY', reportingSource: 'STATE_LAB', category: 'NSQ' }),
      row({ alertMonth: '2025-03', reasonCode: 'SPURIOUS', reportingSource: 'STATE_LAB', category: 'SPURIOUS' }),
    ];
    const doc = computeImpactStats(rows, '2026-09-18T00:00:00.000Z');
    expect(doc.overall.byReasonCode).toEqual({ ASSAY: 2, SPURIOUS: 1 });
    expect(doc.overall.byReportingSource).toEqual({ CENTRAL_LAB: 1, STATE_LAB: 2 });
    expect(doc.overall.byCategory).toEqual({ NSQ: 2, SPURIOUS: 1 });
  });

  it('splits rows into per-month groups keyed by alertMonth', () => {
    const rows: StatsInputRow[] = [
      row({ alertMonth: '2024-09' }),
      row({ alertMonth: '2025-01' }),
      row({ alertMonth: '2025-01' }),
    ];
    const doc = computeImpactStats(rows, '2026-09-18T00:00:00.000Z');
    expect(doc.overall.rows).toBe(3);
    expect(doc.byMonth['2024-09']!.rows).toBe(1);
    expect(doc.byMonth['2025-01']!.rows).toBe(2);
  });
});
