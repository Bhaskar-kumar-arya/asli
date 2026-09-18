import { describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
vi.mock('@aws-sdk/client-cloudwatch', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/client-cloudwatch')>('@aws-sdk/client-cloudwatch');
  return {
    ...actual,
    CloudWatchClient: vi.fn().mockImplementation(() => ({ send: sendMock })),
  };
});

import { fetchMeasuredUsage } from './cloudwatch';

describe('fetchMeasuredUsage', () => {
  it('maps each query id to its single 24h datapoint, defaulting sums to 0', async () => {
    sendMock.mockResolvedValueOnce({
      MetricDataResults: [
        { Id: 'scanCount', Values: [42] },
        { Id: 'scanLatencyAvgMs', Values: [1234] },
        { Id: 'bedrockInputTokens', Values: [50000] },
        { Id: 'tierFlagged', Values: [3] },
        // ingestedRows, ingestionFailed, etc. intentionally absent -> should default to 0
      ],
    });

    const usage = await fetchMeasuredUsage('int', new Date('2026-09-18T00:00:00.000Z'));

    expect(usage.scanCount).toBe(42);
    expect(usage.scanLatencyAvgMs).toBe(1234);
    expect(usage.bedrockInputTokens).toBe(50000);
    expect(usage.tierCounts.FLAGGED).toBe(3);
    expect(usage.tierCounts.VERIFY).toBe(0);
    expect(usage.ingestedRows).toBe(0);
    expect(usage.windowEnd).toBe('2026-09-18T00:00:00.000Z');
    expect(usage.windowStart).toBe('2026-09-17T00:00:00.000Z');

    const call = sendMock.mock.calls[0]?.[0];
    expect(call?.input.MetricDataQueries).toHaveLength(19);
    expect(call?.input.MetricDataQueries[0].MetricStat.Metric.Dimensions).toEqual([{ Name: 'stage', Value: 'int' }]);
  });
});
