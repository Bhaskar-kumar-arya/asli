import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
vi.mock('../lib/ddb', () => ({ createDocClient: () => ({ send }) }));

describe('mark-done handler', () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({});
    process.env.INGESTION_STATE_TABLE = 'asli-dev-a2-ingestion-state';
  });

  it('writes a DONE item with rowCount = writtenCount and the fetch snapshotKey', async () => {
    const { handler } = await import('./mark-done');
    const out = await handler({
      month: '2026-02',
      tab: 'nsq',
      sourceType: 'ENDPOINT',
      category: 'NSQ',
      alertMonth: '2026-02',
      snapshotKey: 'raw/cdsco/endpoint/2026-02/nsq/abc.json',
      writtenCount: 217,
      collisionCount: 0,
      skippedCount: 0,
    });

    const command = send.mock.calls[0]![0];
    expect(command.input.Item.status).toBe('DONE');
    expect(command.input.Item.rowCount).toBe(217);
    expect(command.input.Item.snapshotKeys).toEqual(['raw/cdsco/endpoint/2026-02/nsq/abc.json']);
    expect(out).toEqual({ month: '2026-02', tab: 'nsq', status: 'DONE' });
  });

  it('records an empty snapshotKeys array when no snapshotKey is present (e.g. re-run finding only collisions)', async () => {
    const { handler } = await import('./mark-done');
    await handler({
      month: '2026-02',
      tab: 'nsq',
      sourceType: 'ENDPOINT',
      category: 'NSQ',
      alertMonth: '2026-02',
      writtenCount: 0,
      collisionCount: 217,
      skippedCount: 0,
    });

    const command = send.mock.calls[0]![0];
    expect(command.input.Item.snapshotKeys).toEqual([]);
    expect(command.input.Item.rowCount).toBe(0);
  });
});
