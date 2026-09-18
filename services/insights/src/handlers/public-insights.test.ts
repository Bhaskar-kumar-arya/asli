import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InsightsResponseSchema } from '@asli/contracts';
import type { ImpactStatsDocument } from '@asli/stats';

const sendMock = vi.fn();
vi.mock('../db', () => ({
  getDdb: () => ({ send: sendMock }),
  requireEnv: (name: string) => {
    if (name === 'STATS_TABLE') return 'asli-test-stats';
    throw new Error(`unexpected env ${name}`);
  },
}));

import { handler } from './public-insights';

const document: ImpactStatsDocument = {
  generatedAt: '2026-09-17T00:00:00.000Z',
  overall: {
    rows: 3,
    withinExpiry: 2,
    missingExpiry: 0,
    withinExpiryShare: 2 / 3,
    mfgToAlertLagMonths: { n: 3, mean: 10, median: 10, p10: 5, p90: 15, max: 20 },
    missingMfgMonth: 0,
    alertToExpiryRemainingMonths: { n: 3, mean: 6, median: 6, p10: 2, p90: 10, max: 12 },
    byReasonCode: { ASSAY: 2, DISSOLUTION: 1 },
    byReportingSource: { 'Central Drugs Lab': 2, 'State Drugs Lab': 1 },
    byCategory: { NSQ: 2, SPURIOUS: 1 },
  },
  byMonth: {
    '2025-01': {
      rows: 2,
      withinExpiry: 1,
      missingExpiry: 0,
      withinExpiryShare: 0.5,
      mfgToAlertLagMonths: { n: 2, mean: 10, median: 10, p10: 5, p90: 15, max: 15 },
      missingMfgMonth: 0,
      alertToExpiryRemainingMonths: { n: 2, mean: 6, median: 6, p10: 2, p90: 10, max: 10 },
      byReasonCode: { ASSAY: 2 },
      byReportingSource: { 'Central Drugs Lab': 2 },
      byCategory: { NSQ: 1, SPURIOUS: 1 },
    },
    '2025-03': {
      rows: 1,
      withinExpiry: 1,
      missingExpiry: 0,
      withinExpiryShare: 1,
      mfgToAlertLagMonths: { n: 1, mean: 20, median: 20, p10: 20, p90: 20, max: 20 },
      missingMfgMonth: 0,
      alertToExpiryRemainingMonths: { n: 1, mean: 12, median: 12, p10: 12, p90: 12, max: 12 },
      byReasonCode: { DISSOLUTION: 1 },
      byReportingSource: { 'State Drugs Lab': 1 },
      byCategory: { NSQ: 1, SPURIOUS: 0 },
    },
  },
};

describe('GET /v1/public/insights handler', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('returns an InsightsResponse-conformant body plus chart detail', async () => {
    sendMock.mockResolvedValue({ Item: { PK: 'STATS#IMPACT', SK: 'ALL', document } });

    const res = await handler();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);

    // Every field InsightsResponseSchema declares must validate, even with real, richer keys alongside it.
    expect(() => InsightsResponseSchema.parse(body)).not.toThrow();
    expect(body.byCategory).toEqual({ NSQ: 2, SPURIOUS: 1 });
    expect(body.byMonth).toEqual([
      { month: '2025-01', count: 2 },
      { month: '2025-03', count: 1 },
    ]);
    expect(body.topReasonCodes).toEqual([
      { reasonCode: 'ASSAY', count: 2 },
      { reasonCode: 'DISSOLUTION', count: 1 },
    ]);
    expect(body.byMonthCategory).toEqual([
      { month: '2025-01', NSQ: 1, SPURIOUS: 1 },
      { month: '2025-03', NSQ: 1, SPURIOUS: 0 },
    ]);
    expect(body.byReportingSource).toEqual([
      { reportingSource: 'Central Drugs Lab', count: 2 },
      { reportingSource: 'State Drugs Lab', count: 1 },
    ]);
    expect(body.withinExpiry).toEqual({ rows: 3, withinExpiry: 2, missingExpiry: 0, withinExpiryShare: 2 / 3 });
    expect(body.mfgToAlertLagMonths.median).toBe(10);
    expect(body.alertToExpiryRemainingMonths.median).toBe(6);
  });

  it('returns a zeroed body before compute-stats has ever run', async () => {
    sendMock.mockResolvedValue({});

    const res = await handler();
    const body = JSON.parse(res.body as string);

    expect(() => InsightsResponseSchema.parse(body)).not.toThrow();
    expect(body.byMonth).toEqual([]);
    expect(body.topReasonCodes).toEqual([]);
    expect(body.withinExpiry.rows).toBe(0);
  });
});
