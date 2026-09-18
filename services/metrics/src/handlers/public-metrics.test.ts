import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetricsSummarySchema } from '@asli/contracts';

vi.mock('../cloudwatch', () => ({
  fetchMeasuredUsage: vi.fn(),
}));
vi.mock('../accuracyReport', () => ({
  readLatestAccuracyReport: vi.fn(),
}));

import { fetchMeasuredUsage } from '../cloudwatch';
import { readLatestAccuracyReport } from '../accuracyReport';
import { handler } from './public-metrics';

const usageFn = vi.mocked(fetchMeasuredUsage);
const accuracyFn = vi.mocked(readLatestAccuracyReport);

describe('GET /v1/public/metrics handler', () => {
  beforeEach(() => {
    process.env.STAGE = 'int';
    process.env.PUBLIC_BUCKET_NAME = 'asli-int-public';
    usageFn.mockReset();
    accuracyFn.mockReset();
  });

  it('returns a MetricsSummary-conformant body plus dashboard detail, with no accuracy report yet', async () => {
    usageFn.mockResolvedValue({
      scanCount: 0,
      bedrockInputTokens: 0,
      bedrockOutputTokens: 0,
      textractPages: 0,
      translateCharacters: 0,
      pollyCharacters: 0,
      ingestedRows: 0,
      ingestionFailed: 0,
      matchesCreated: 0,
      pushSent: 0,
      pushFailed: 0,
      emailSent: 0,
      emailFailed: 0,
      tierCounts: { FLAGGED: 0, VERIFY: 0, NO_ALERT_FOUND: 0 },
      windowStart: '2026-09-17T00:00:00.000Z',
      windowEnd: '2026-09-18T00:00:00.000Z',
    });
    accuracyFn.mockResolvedValue(undefined);

    const res = await handler();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);

    // Every field MetricsSummarySchema declares must validate, even with real, richer keys alongside it.
    expect(() => MetricsSummarySchema.parse(body)).not.toThrow();
    expect(body.accuracy.sampleSize).toBe(0);
    expect(body.cost.costPer1000ScansUsd).toBeUndefined();
    expect(body.accuracyDetail).toBeUndefined();
    expect(body.costDetail.window).toEqual({ start: '2026-09-17T00:00:00.000Z', end: '2026-09-18T00:00:00.000Z' });
    expect(body.costDetail.tenThousandFamilyProjection.assumptions.projectedFamilies).toBe(10_000);
  });

  it('includes accuracy detail when a report exists', async () => {
    usageFn.mockResolvedValue({
      scanCount: 10,
      bedrockInputTokens: 1000,
      bedrockOutputTokens: 200,
      textractPages: 0,
      translateCharacters: 0,
      pollyCharacters: 0,
      ingestedRows: 0,
      ingestionFailed: 0,
      matchesCreated: 0,
      pushSent: 0,
      pushFailed: 0,
      emailSent: 0,
      emailFailed: 0,
      tierCounts: { FLAGGED: 0, VERIFY: 0, NO_ALERT_FOUND: 10 },
      windowStart: '2026-09-17T00:00:00.000Z',
      windowEnd: '2026-09-18T00:00:00.000Z',
    });
    accuracyFn.mockResolvedValue({
      runId: 'r1',
      generatedAt: '2026-09-17T12:00:00.000Z',
      sampleSize: 40,
      tierCorrectnessRate: 0.9,
      byMethod: [{ method: 'strip_vision', count: 30, batchExactRate: 0.9 }],
      byCondition: [],
    });

    const res = await handler();
    const body = JSON.parse(res.body as string);

    expect(body.accuracy.sampleSize).toBe(40);
    expect(body.accuracy.measuredAt).toBe('2026-09-17T12:00:00.000Z');
    expect(body.accuracyDetail.tierCorrectnessRate).toBe(0.9);
    expect(body.accuracyDetail.byMethod).toHaveLength(1);
  });
});
