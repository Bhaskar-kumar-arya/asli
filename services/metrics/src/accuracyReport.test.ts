import { describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
vi.mock('@aws-sdk/client-s3', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  };
});

import { readLatestAccuracyReport } from './accuracyReport';

function bodyFor(json: unknown): { transformToString: () => Promise<string> } {
  return { transformToString: () => Promise.resolve(JSON.stringify(json)) };
}

describe('readLatestAccuracyReport', () => {
  it('returns undefined when the object does not exist', async () => {
    const { NoSuchKey } = await vi.importActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
    sendMock.mockRejectedValueOnce(new NoSuchKey({ message: 'not found', $metadata: {} }));
    const result = await readLatestAccuracyReport('asli-int-public');
    expect(result).toBeUndefined();
  });

  it('extracts sampleSize, tier correctness, and breakdowns from a real-shaped report', async () => {
    sendMock.mockResolvedValueOnce({
      Body: bodyFor({
        runId: '2026-09-18T00-00-00-000Z',
        generatedAt: '2026-09-18T00:05:00.000Z',
        summary: {
          sampleSize: 40,
          byMethod: [{ method: 'strip_vision', count: 30, batchExactRate: 0.9 }],
          byCondition: [{ condition: 'lighting', value: 'poor', count: 5, batchExactRate: 0.6 }],
        },
        tierCorrectness: { rate: 0.95 },
        cost: { costPer1000ScansUsd: 1.5 },
      }),
    });

    const result = await readLatestAccuracyReport('asli-int-public');

    expect(result).toEqual({
      runId: '2026-09-18T00-00-00-000Z',
      generatedAt: '2026-09-18T00:05:00.000Z',
      sampleSize: 40,
      tierCorrectnessRate: 0.95,
      byMethod: [{ method: 'strip_vision', count: 30, batchExactRate: 0.9 }],
      byCondition: [{ condition: 'lighting', value: 'poor', count: 5, batchExactRate: 0.6 }],
      costPer1000ScansUsd: 1.5,
    });
  });

  it('returns undefined for malformed JSON instead of throwing', async () => {
    sendMock.mockResolvedValueOnce({ Body: bodyFor({ notAReport: true }) });
    const result = await readLatestAccuracyReport('asli-int-public');
    expect(result).toBeUndefined();
  });
});
