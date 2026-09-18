import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';
import { createLookup } from './lookup';

const exactRow = {
  PK: 'BATCH#GTL1258',
  SK: 'ALERT#2025-03#NSQ#hash-exact',
  productName: 'Amoxicillin 500mg Capsules',
  batchRaw: 'GTL 1258',
  batchNorm: 'GTL1258',
  batchSkeleton: '6T11258',
  mfgMonth: null,
  expMonth: '2026-10',
  manufacturerRaw: 'M/s. Gidsha Pharmaceuticals Pvt. Ltd.',
  manufacturerNorm: 'GIDSHA',
  category: 'NSQ',
  reasonRaw: 'Assay (content of the drug) found outside limits',
  reasonCode: 'ASSAY',
  reportingSource: 'STATE_LAB',
  alertMonth: '2025-03',
  sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Mar-2025&source=All&tab=nsq',
  snapshotKey: 'raw/cdsco/endpoint/2025-03/nsq/hash-exact.html',
  rowHash: 'hash-exact',
  alertId: 'hash-exact',
  ingestedAt: '2025-03-05T06:00:00.000Z',
  demo: false,
};

const nearRow = {
  ...exactRow,
  SK: 'ALERT#2025-02#NSQ#hash-near',
  batchRaw: 'GTLI258',
  rowHash: 'hash-near',
  alertId: 'hash-near',
  alertMonth: '2025-02',
  snapshotKey: 'raw/cdsco/endpoint/2025-02/nsq/hash-near.html',
};

function fakeDdb(handlers: {
  query?: (cmd: QueryCommand) => { Items?: unknown[] };
  scan?: (cmd: ScanCommand) => { Items?: unknown[]; LastEvaluatedKey?: unknown };
}): DynamoDBDocumentClient {
  const send = vi.fn(async (cmd: unknown) => {
    if (cmd instanceof QueryCommand) return handlers.query?.(cmd) ?? { Items: [] };
    if (cmd instanceof ScanCommand) return handlers.scan?.(cmd) ?? { Items: [] };
    throw new Error('unexpected command');
  });
  return { send } as unknown as DynamoDBDocumentClient;
}

describe('findCandidates', () => {
  it('merges exact (batchNorm) and near (skeleton) results, deduped by alertId', async () => {
    const ddb = fakeDdb({
      query: (cmd) => {
        if (cmd.input.IndexName === 'GSI1') return { Items: [nearRow, exactRow] };
        return { Items: [exactRow] };
      },
    });
    const lookup = createLookup({ ddb, flaggedBatchesTable: 'flagged-batches', ingestionStateTable: 'ingestion-state' });

    const result = await lookup.findCandidates({ batchNumber: 'GTL 1258' });

    expect(result.map((r) => r.alertId).sort()).toEqual(['hash-exact', 'hash-near']);
    expect(result.every((r) => !('PK' in r))).toBe(true);
  });

  it('normalizes the batch number before querying', async () => {
    let exactPk: unknown;
    let nearPk: unknown;
    const ddb = fakeDdb({
      query: (cmd) => {
        if (cmd.input.IndexName === 'GSI1') {
          nearPk = cmd.input.ExpressionAttributeValues?.[':pk'];
        } else {
          exactPk = cmd.input.ExpressionAttributeValues?.[':pk'];
        }
        return { Items: [] };
      },
    });
    const lookup = createLookup({ ddb, flaggedBatchesTable: 'flagged-batches', ingestionStateTable: 'ingestion-state' });

    await lookup.findCandidates({ batchNumber: 'B.No: gtl-1258' });

    expect(exactPk).toBe('BATCH#GTL1258');
    expect(nearPk).toBe('SKEL#6T11258');
  });
});

describe('getCheckedAgainst', () => {
  it('counts distinct DONE months and returns the latest', async () => {
    const ddb = fakeDdb({
      scan: () => ({
        Items: [
          { PK: 'MONTH#2025-01', SK: 'TAB#nsq', status: 'DONE' },
          { PK: 'MONTH#2025-01', SK: 'TAB#spurious', status: 'DONE' },
          { PK: 'MONTH#2025-03', SK: 'TAB#nsq', status: 'DONE' },
        ],
      }),
    });
    const lookup = createLookup({ ddb, flaggedBatchesTable: 'flagged-batches', ingestionStateTable: 'ingestion-state' });

    const result = await lookup.getCheckedAgainst();

    expect(result).toEqual({ monthCount: 2, latestMonth: '2025-03' });
  });

  it('paginates through Scan results', async () => {
    let calls = 0;
    const ddb = fakeDdb({
      scan: () => {
        calls += 1;
        if (calls === 1) {
          return { Items: [{ PK: 'MONTH#2025-01', status: 'DONE' }], LastEvaluatedKey: { PK: 'x' } };
        }
        return { Items: [{ PK: 'MONTH#2025-02', status: 'DONE' }] };
      },
    });
    const lookup = createLookup({ ddb, flaggedBatchesTable: 'flagged-batches', ingestionStateTable: 'ingestion-state' });

    const result = await lookup.getCheckedAgainst();

    expect(calls).toBe(2);
    expect(result).toEqual({ monthCount: 2, latestMonth: '2025-02' });
  });

  it('caches the result for 5 minutes', async () => {
    let calls = 0;
    const ddb = fakeDdb({
      scan: () => {
        calls += 1;
        return { Items: [{ PK: 'MONTH#2025-01', status: 'DONE' }] };
      },
    });
    let time = 0;
    const lookup = createLookup({
      ddb,
      flaggedBatchesTable: 'flagged-batches',
      ingestionStateTable: 'ingestion-state',
      now: () => time,
    });

    await lookup.getCheckedAgainst();
    time += 4 * 60 * 1000;
    await lookup.getCheckedAgainst();
    expect(calls).toBe(1);

    time += 2 * 60 * 1000;
    await lookup.getCheckedAgainst();
    expect(calls).toBe(2);
  });
});
