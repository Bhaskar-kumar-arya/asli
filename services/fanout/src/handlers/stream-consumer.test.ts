import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { AlertEvent, FlaggedBatch } from '@asli/contracts';

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: vi.fn(() => ({ send: vi.fn() })) } }));

const publish = vi.fn(async (_input: { input: unknown }) => ({}));
vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: vi.fn(() => ({ send: publish })),
  PublishCommand: vi.fn((input: unknown) => ({ input })),
}));

const getCheckedAgainst = vi.fn(async () => ({ monthCount: 6, latestMonth: '2026-09' }));
vi.mock('@asli/lookup', () => ({ createLookup: vi.fn(() => ({ getCheckedAgainst })) }));

vi.mock('../reference/alias-map', () => ({ createAliasMapLoader: vi.fn(() => async () => ({})) }));

const alertEvent: AlertEvent = {
  eventId: 'evt-1',
  trigger: 'NEW_ALERT',
  cabinetId: 'cab-1',
  medId: 'med-1',
  tier: 'FLAGGED',
  alert: {
    alertRef: 'ref',
    alertMonth: '2026-09',
    category: 'NSQ',
    productName: 'Amoxicillin',
    batchRaw: 'GTL 1258',
    manufacturerRaw: 'Gidsha',
    reasonCode: 'ASSAY',
    reasonRaw: 'assay',
    reportingSource: 'STATE_LAB',
    sourceUrl: 'https://cdscoonline.gov.in/x',
    demo: false,
  },
  createdAt: '2026-09-18T12:00:00.000Z',
};

const processFlaggedBatch = vi.fn(async (_row: unknown, _deps: unknown) => [alertEvent]);
vi.mock('../fan-out', () => ({ processFlaggedBatch: (row: unknown, deps: unknown) => processFlaggedBatch(row, deps) }));

function makeRow(): FlaggedBatch {
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
  };
}

function makeEvent(rows: FlaggedBatch[], eventNames: ('INSERT' | 'MODIFY' | 'REMOVE')[] = []): DynamoDBStreamEvent {
  return {
    Records: rows.map((row, i) => ({
      eventName: eventNames[i] ?? 'INSERT',
      dynamodb: { NewImage: marshall(row) },
    })),
  } as unknown as DynamoDBStreamEvent;
}

beforeEach(() => {
  vi.clearAllMocks();
  processFlaggedBatch.mockResolvedValue([alertEvent]);
  process.env.FLAGGED_BATCHES_TABLE = 'flagged-batches';
  process.env.INGESTION_STATE_TABLE = 'ingestion-state';
  process.env.CABINETS_TABLE = 'cabinets';
  process.env.REFERENCE_TABLE = 'reference';
  process.env.ALERTS_TOPIC_ARN = 'arn:aws:sns:ap-south-1:111111111111:asli-dev-g2-alerts';
});

describe('stream-consumer handler', () => {
  it('processes each INSERT record and publishes its AlertEvents to SNS', async () => {
    const { handler } = await import('./stream-consumer');
    await handler(makeEvent([makeRow()]));

    expect(processFlaggedBatch).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledTimes(1);
    const publishedInput = publish.mock.calls[0]?.[0]?.input as { Message: string; MessageAttributes: unknown };
    expect(JSON.parse(publishedInput.Message)).toMatchObject({ eventId: 'evt-1', trigger: 'NEW_ALERT' });
  });

  it('skips non-INSERT records', async () => {
    const { handler } = await import('./stream-consumer');
    await handler(makeEvent([makeRow()], ['MODIFY']));

    expect(processFlaggedBatch).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes nothing when processFlaggedBatch returns no events (e.g. backfill-suppressed)', async () => {
    processFlaggedBatch.mockResolvedValueOnce([]);
    const { handler } = await import('./stream-consumer');
    await handler(makeEvent([makeRow()]));

    expect(publish).not.toHaveBeenCalled();
  });
});
