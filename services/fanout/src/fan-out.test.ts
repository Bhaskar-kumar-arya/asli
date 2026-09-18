import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlaggedBatch, MedicineIdentity } from '@asli/contracts';
import { processFlaggedBatch } from './fan-out';

const NOW = new Date('2026-09-18T12:00:00.000Z');

function makeRow(overrides: Partial<FlaggedBatch> = {}): FlaggedBatch {
  return {
    productName: 'Amoxicillin 500mg Capsules',
    batchRaw: 'GTL 1258',
    batchNorm: 'GTL1258',
    batchSkeleton: '6T11258',
    mfgMonth: null,
    expMonth: null,
    manufacturerRaw: 'M/s. Gidsha Pharmaceuticals Pvt. Ltd.',
    manufacturerNorm: 'GIDSHA',
    category: 'NSQ',
    reasonRaw: 'Assay (content of the drug) found outside limits',
    reasonCode: 'ASSAY',
    reportingSource: 'STATE_LAB',
    alertMonth: '2026-09',
    sourceUrl: 'https://cdscoonline.gov.in/x',
    snapshotKey: 'raw/cdsco/endpoint/2026-09/nsq/abc.html',
    rowHash: 'row-hash-1',
    alertId: 'row-hash-1',
    ingestedAt: '2026-09-18T06:00:00.000Z',
    demo: false,
    ...overrides,
  };
}

function makeMedicine(identity: MedicineIdentity, opts: { latestTier?: string; medId?: string; cabinetId?: string } = {}) {
  const medId = opts.medId ?? 'med-1';
  const cabinetId = opts.cabinetId ?? 'cab-1';
  return {
    PK: `CAB#${cabinetId}`,
    SK: `MED#${medId}`,
    identity,
    label: 'Mom - morning tablet',
    addedBy: 'user-1',
    addedAt: '2026-09-01T00:00:00.000Z',
    latestTier: opts.latestTier ?? 'PENDING',
    GSI3PK: 'SKEL#6T11258',
    GSI3SK: `CAB#${cabinetId}#MED#${medId}`,
  };
}

function fakeDdb(handlers: { query?: () => unknown; put?: (input: unknown) => unknown; update?: (input: unknown) => unknown }) {
  return {
    send: vi.fn(async (command: { constructor: { name: string }; input: unknown }) => {
      switch (command.constructor.name) {
        case 'QueryCommand':
          return handlers.query?.() ?? { Items: [] };
        case 'PutCommand':
          return handlers.put?.(command.input) ?? {};
        case 'UpdateCommand':
          return handlers.update?.(command.input) ?? {};
        default:
          throw new Error(`unexpected command ${command.constructor.name}`);
      }
    }),
  };
}

/** Finds the input of the first call to `ddb.send` whose command matches `commandName`. */
function findCommandInput(ddb: ReturnType<typeof fakeDdb>, commandName: string): { Item?: Record<string, unknown>; ExpressionAttributeValues?: Record<string, unknown> } {
  const call = ddb.send.mock.calls.find(
    (args) => (args[0] as { constructor: { name: string } }).constructor.name === commandName,
  );
  if (!call) throw new Error(`no ${commandName} call found`);
  return (call[0] as { input: { Item?: Record<string, unknown>; ExpressionAttributeValues?: Record<string, unknown> } }).input;
}

const checkedAgainst = { monthCount: 6, latestMonth: '2026-09' };

describe('processFlaggedBatch', () => {
  let medicine: ReturnType<typeof makeMedicine>;

  beforeEach(() => {
    medicine = makeMedicine({
      productName: 'Amoxicillin 500mg Capsules',
      batchNumber: 'GTL 1258',
      manufacturer: 'Gidsha Pharmaceuticals',
      source: 'strip_vision',
    });
  });

  it('creates a MATCH and returns an AlertEvent for a fresh FLAGGED match', async () => {
    const ddb = fakeDdb({ query: () => ({ Items: [medicine] }) });
    const row = makeRow();

    const events = await processFlaggedBatch(row, {
      ddb: ddb as never,
      cabinetsTable: 'cabinets',
      aliases: {},
      checkedAgainst,
      now: () => NOW,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ trigger: 'NEW_ALERT', tier: 'FLAGGED', cabinetId: 'cab-1', medId: 'med-1' });

    const putInput = findCommandInput(ddb, 'PutCommand');
    expect(putInput.Item).toMatchObject({ tier: 'FLAGGED', trigger: 'NEW_ALERT' });
    expect(putInput.Item?.notifiedAt).toBeDefined();

    const updateInput = findCommandInput(ddb, 'UpdateCommand');
    expect(updateInput.ExpressionAttributeValues?.[':new']).toBe('FLAGGED');
  });

  it('reprocessing the same row is a no-op (conditional put fails)', async () => {
    const ddb = fakeDdb({
      query: () => ({ Items: [medicine] }),
      put: () => {
        throw Object.assign(new Error('exists'), { name: 'ConditionalCheckFailedException' });
      },
    });

    const events = await processFlaggedBatch(makeRow(), {
      ddb: ddb as never,
      cabinetsTable: 'cabinets',
      aliases: {},
      checkedAgainst,
      now: () => NOW,
    });

    expect(events).toHaveLength(0);
  });

  it('still writes the MATCH but suppresses the notification for an alertMonth older than 60 days', async () => {
    const ddb = fakeDdb({ query: () => ({ Items: [medicine] }) });
    const row = makeRow({ alertMonth: '2025-01' });

    const events = await processFlaggedBatch(row, {
      ddb: ddb as never,
      cabinetsTable: 'cabinets',
      aliases: {},
      checkedAgainst,
      now: () => NOW,
    });

    expect(events).toHaveLength(0);
    const putInput = findCommandInput(ddb, 'PutCommand');
    expect(putInput.Item?.notifiedAt).toBeUndefined();
  });

  it('always notifies for a DEMO row, regardless of alertMonth age', async () => {
    const ddb = fakeDdb({ query: () => ({ Items: [medicine] }) });
    const row = makeRow({ alertMonth: '2025-01', demo: true });

    const events = await processFlaggedBatch(row, {
      ddb: ddb as never,
      cabinetsTable: 'cabinets',
      aliases: {},
      checkedAgainst,
      now: () => NOW,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.trigger).toBe('DEMO');
  });

  it('does not create a MATCH or bump latestTier when no candidate medicines are found', async () => {
    const ddb = fakeDdb({ query: () => ({ Items: [] }) });

    const events = await processFlaggedBatch(makeRow(), {
      ddb: ddb as never,
      cabinetsTable: 'cabinets',
      aliases: {},
      checkedAgainst,
      now: () => NOW,
    });

    expect(events).toHaveLength(0);
    expect(ddb.send).toHaveBeenCalledTimes(1); // only the QueryCommand
  });

  it('does not bump latestTier when the candidate is already at a higher tier', async () => {
    medicine = makeMedicine(
      { productName: 'x', batchNumber: 'GTL 1258', manufacturer: 'Gidsha Pharmaceuticals', source: 'manual' },
      { latestTier: 'FLAGGED' },
    );
    const ddb = fakeDdb({ query: () => ({ Items: [medicine] }) });

    await processFlaggedBatch(makeRow(), {
      ddb: ddb as never,
      cabinetsTable: 'cabinets',
      aliases: {},
      checkedAgainst,
      now: () => NOW,
    });

    const updateCall = ddb.send.mock.calls.find(([cmd]: [{ constructor: { name: string } }]) => cmd.constructor.name === 'UpdateCommand');
    expect(updateCall).toBeUndefined();
  });

  it('does not match a candidate whose manufacturer collides (batch equal, manufacturer MISMATCH)', async () => {
    medicine = makeMedicine({
      productName: 'x',
      batchNumber: 'GTL 1258',
      manufacturer: 'Cipla Ltd',
      source: 'manual',
    });
    const ddb = fakeDdb({ query: () => ({ Items: [medicine] }) });

    const events = await processFlaggedBatch(makeRow(), {
      ddb: ddb as never,
      cabinetsTable: 'cabinets',
      aliases: {},
      checkedAgainst,
      now: () => NOW,
    });

    expect(events).toHaveLength(0);
    expect(ddb.send).toHaveBeenCalledTimes(1); // only the QueryCommand - no PutCommand for a collision
  });
});
