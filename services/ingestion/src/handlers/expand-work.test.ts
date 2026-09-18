import { describe, expect, it } from 'vitest';
import { handler } from './expand-work';

describe('expand-work handler', () => {
  it('produces the cartesian product of months x tabs, carrying sourceType and fixtureKey through', async () => {
    const out = await handler({
      months: ['2026-01', '2026-02'],
      tabs: ['nsq', 'spurious'],
      sourceType: 'ENDPOINT',
    });

    expect(out.items).toEqual([
      { month: '2026-01', tab: 'nsq', sourceType: 'ENDPOINT', fixtureKey: undefined },
      { month: '2026-01', tab: 'spurious', sourceType: 'ENDPOINT', fixtureKey: undefined },
      { month: '2026-02', tab: 'nsq', sourceType: 'ENDPOINT', fixtureKey: undefined },
      { month: '2026-02', tab: 'spurious', sourceType: 'ENDPOINT', fixtureKey: undefined },
    ]);
  });

  it('returns an empty list for an empty months array (check-months has nothing missing)', async () => {
    const out = await handler({ months: [], tabs: ['nsq'], sourceType: 'ENDPOINT' });
    expect(out.items).toEqual([]);
  });

  it('carries fixtureKey through for the demo replay FIXTURE path', async () => {
    const out = await handler({
      months: ['DEMO'],
      tabs: ['nsq'],
      sourceType: 'FIXTURE',
      fixtureKey: 'fixtures/demo/replay-1.json',
    });
    expect(out.items).toEqual([
      { month: 'DEMO', tab: 'nsq', sourceType: 'FIXTURE', fixtureKey: 'fixtures/demo/replay-1.json' },
    ]);
  });
});
