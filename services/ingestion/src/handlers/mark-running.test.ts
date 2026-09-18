import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
vi.mock('../lib/ddb', () => ({ createDocClient: () => ({ send }) }));

describe('mark-running handler', () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({});
    process.env.INGESTION_STATE_TABLE = 'asli-dev-a2-ingestion-state';
  });

  it('writes a RUNNING IngestionState item keyed by month/tab and returns the item unchanged', async () => {
    const { handler } = await import('./mark-running');
    const event = { month: '2026-02', tab: 'nsq' as const, sourceType: 'ENDPOINT' as const };

    const out = await handler(event);

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0]![0];
    expect(command.input.TableName).toBe('asli-dev-a2-ingestion-state');
    expect(command.input.Item.PK).toBe('MONTH#2026-02');
    expect(command.input.Item.SK).toBe('TAB#nsq');
    expect(command.input.Item.status).toBe('RUNNING');
    expect(out).toEqual(event);
  });

  it('throws if INGESTION_STATE_TABLE is unset (fails fast into the state machine Catch)', async () => {
    delete process.env.INGESTION_STATE_TABLE;
    const { handler } = await import('./mark-running');
    await expect(handler({ month: '2026-02', tab: 'nsq', sourceType: 'ENDPOINT' })).rejects.toThrow(
      /INGESTION_STATE_TABLE/,
    );
  });
});
