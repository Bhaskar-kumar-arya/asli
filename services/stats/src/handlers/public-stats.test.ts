import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ddbMock = { send: vi.fn() };
vi.mock('../db', () => ({
  getDdb: () => ddbMock,
  requireEnv: (name: string) => `env-${name}`,
}));

describe('GET /v1/public/stats', () => {
  beforeEach(() => {
    ddbMock.send.mockReset();
    process.env.STATS_TABLE = 'asli-dev-s-stats';
  });

  it('returns the cached STATS#PUBLIC/ALL document', async () => {
    const document = {
      generatedAt: '2026-09-01T00:00:00.000Z',
      monthsCovered: 3,
      latestMonth: '2025-03',
      totalFlaggedBatches: 171,
      cabinetsProtected: 12,
      medicinesTracked: 40,
    };
    ddbMock.send.mockImplementation(async (cmd) => {
      expect(cmd).toBeInstanceOf(GetCommand);
      expect(cmd.input.Key).toEqual({ PK: 'STATS#PUBLIC', SK: 'ALL' });
      return { Item: { PK: 'STATS#PUBLIC', SK: 'ALL', document } };
    });

    const { handler } = await import('./public-stats');
    const res = await handler();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body ?? '{}')).toEqual(document);
  });

  it('falls back to a zeroed PublicStats before compute-stats has ever run', async () => {
    ddbMock.send.mockResolvedValue({});

    const { handler } = await import('./public-stats');
    const res = await handler();
    const body = JSON.parse(res.body ?? '{}');
    expect(body.totalFlaggedBatches).toBe(0);
    expect(body.monthsCovered).toBe(0);
  });
});
