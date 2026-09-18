import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlaggedBatch } from '@asli/contracts';

const s3Send = vi.fn();
const docSend = vi.fn();
const normalizeRows = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: s3Send })),
  GetObjectCommand: vi.fn((input: unknown) => ({ input })),
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: docSend }) },
  PutCommand: vi.fn((input: unknown) => ({ input })),
  GetCommand: vi.fn((input: unknown) => ({ input })),
  ScanCommand: vi.fn((input: unknown) => ({ input })),
}));
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({ BedrockRuntimeClient: vi.fn() }));
vi.mock('../lib/reason-classifier-bedrock', () => ({ createBedrockReasonClassifier: vi.fn(() => vi.fn()) }));
vi.mock('../cdsco', () => ({ normalizeRows }));
vi.mock('@aws-lambda-powertools/metrics', () => ({
  Metrics: vi.fn().mockImplementation(() => ({
    addDimension: vi.fn(),
    addMetric: vi.fn(),
    publishStoredMetrics: vi.fn(),
  })),
  MetricUnit: { Count: 'Count' },
}));

function fakeBatch(overrides: Partial<FlaggedBatch>): FlaggedBatch {
  return {
    productName: 'Amoxicillin 500mg Capsules',
    batchRaw: 'GTL 1258',
    batchNorm: 'GTL1258',
    batchSkeleton: '6T11258',
    mfgMonth: null,
    expMonth: '2026-10',
    manufacturerRaw: 'M/s. Gidsha Pharmaceuticals Pvt. Ltd.',
    manufacturerNorm: 'GIDSHA',
    category: 'NSQ',
    reasonRaw: 'Assay found outside limits',
    reasonCode: 'ASSAY',
    reportingSource: 'STATE_LAB',
    reportingLab: 'State Drug Testing Laboratory',
    alertMonth: '2026-02',
    sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq',
    snapshotKey: 'raw/cdsco/endpoint/2026-02/nsq/abc.json',
    rowHash: 'hash-a',
    alertId: 'hash-a',
    ingestedAt: new Date().toISOString(),
    demo: false,
    ...overrides,
  };
}

function fakeRowsBody(rows: unknown[] = [{ productName: 'x' }]): { transformToString: () => Promise<string> } {
  return { transformToString: () => Promise.resolve(JSON.stringify(rows)) };
}

describe('normalize-and-write handler', () => {
  beforeEach(() => {
    s3Send.mockReset().mockResolvedValue({ Body: fakeRowsBody() });
    docSend.mockReset();
    normalizeRows.mockReset();
    process.env.FLAGGED_BATCHES_TABLE = 'asli-dev-a2-flagged-batches';
    process.env.REFERENCE_TABLE = 'asli-dev-a2-reference';
    process.env.BEDROCK_TEXT_MODEL_ID = 'anthropic.claude-3-haiku';
    process.env.RAW_BUCKET_NAME = 'asli-dev-a2-raw';
  });

  const baseEvent = {
    month: '2026-02',
    tab: 'nsq' as const,
    sourceType: 'ENDPOINT' as const,
    category: 'NSQ' as const,
    alertMonth: '2026-02',
    sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq',
    snapshotKey: 'raw/cdsco/endpoint/2026-02/nsq/abc.json',
    parsedRowsKey: 'raw/cdsco/parsed/2026-02/nsq/rows.json',
    rowCount: 2,
    demo: false,
  };

  it('writes every new batch and counts a rerun of the same rows as zero new items (acceptance criterion)', async () => {
    normalizeRows.mockResolvedValue([fakeBatch({ rowHash: 'a', alertId: 'a' }), fakeBatch({ rowHash: 'b', alertId: 'b' })]);
    docSend.mockResolvedValue({});

    const { handler } = await import('./normalize-and-write');
    const first = await handler(baseEvent);
    expect(first.writtenCount).toBe(2);
    expect(first.collisionCount).toBe(0);

    // Second run of the same month: every conditional put now fails.
    docSend.mockReset();
    const conflict = Object.assign(new Error('conflict'), { name: 'ConditionalCheckFailedException' });
    docSend.mockRejectedValue(conflict);

    const second = await handler(baseEvent);
    expect(second.writtenCount).toBe(0);
    expect(second.collisionCount).toBe(2);
  });

  it('never passes an aliases dep to normalizeRows, so manufacturerNorm (and rowHash) stays stable across reruns as Reference evolves', async () => {
    normalizeRows.mockResolvedValue([fakeBatch({})]);
    docSend.mockResolvedValue({});

    const { handler } = await import('./normalize-and-write');
    await handler(baseEvent);

    const [, deps] = normalizeRows.mock.calls[0]!;
    expect(deps).not.toHaveProperty('aliases');
  });

  it('tags every written FlaggedBatch demo:true when the fetch came from the FIXTURE branch', async () => {
    normalizeRows.mockResolvedValue([fakeBatch({ demo: false })]);
    docSend.mockResolvedValue({});

    const { handler } = await import('./normalize-and-write');
    await handler({ ...baseEvent, demo: true });

    const putCommand = docSend.mock.calls[0]![0];
    expect(putCommand.input.Item.demo).toBe(true);
  });

  it('keys each written item with PK/SK/GSI1/GSI2 built from the batch fields', async () => {
    normalizeRows.mockResolvedValue([fakeBatch({})]);
    docSend.mockResolvedValue({});

    const { handler } = await import('./normalize-and-write');
    await handler(baseEvent);

    const item = docSend.mock.calls[0]![0].input.Item;
    expect(item.PK).toBe('BATCH#GTL1258');
    expect(item.SK).toBe('ALERT#2026-02#NSQ#hash-a');
    expect(item.GSI1PK).toBe('SKEL#6T11258');
    expect(item.GSI2PK).toBe('MONTH#2026-02');
  });

  it('reports skippedCount as the gap between ParsedRow input and normalized output', async () => {
    s3Send.mockResolvedValue({ Body: fakeRowsBody([{ a: 1 }, { a: 2 }, { a: 3 }]) });
    normalizeRows.mockResolvedValue([fakeBatch({})]); // 3 rows in, 1 batch out - 2 skipped (no batch number)
    docSend.mockResolvedValue({});

    const { handler } = await import('./normalize-and-write');
    const out = await handler(baseEvent);
    expect(out.skippedCount).toBe(2);
  });
});
