import { beforeEach, describe, expect, it, vi } from 'vitest';

const listAvailableMonths = vi.fn();
const docSend = vi.fn();
const sfnSend = vi.fn();

vi.mock('../cdsco', () => ({ createCdscoClient: () => ({ listAvailableMonths }) }));
vi.mock('../lib/ddb', () => ({ createDocClient: () => ({ send: docSend }) }));
vi.mock('@aws-sdk/client-s3', () => ({ S3Client: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({ GetCommand: vi.fn((input: unknown) => ({ input })) }));
vi.mock('@aws-sdk/client-sfn', () => ({
  SFNClient: vi.fn().mockImplementation(() => ({ send: sfnSend })),
  StartExecutionCommand: vi.fn((input: unknown) => ({ input })),
}));

describe('check-months handler', () => {
  beforeEach(() => {
    listAvailableMonths.mockReset();
    docSend.mockReset();
    sfnSend.mockReset().mockResolvedValue({ executionArn: 'arn:aws:states:...:execution:ingest:1' });
    process.env.RAW_BUCKET_NAME = 'asli-dev-a2-raw';
    process.env.STATE_MACHINE_ARN = 'arn:aws:states:ap-south-1:111111111111:stateMachine:asli-dev-a2-ingest';
    process.env.INGESTION_STATE_TABLE = 'asli-dev-a2-ingestion-state';
  });

  it('starts one execution covering every month missing DONE for either tab', async () => {
    listAvailableMonths.mockImplementation(async (year: number) => (year === 2026 ? ['2026-01', '2026-02'] : []));
    // 2026-01 is fully DONE (both tabs); 2026-02 is missing its spurious tab.
    docSend.mockImplementation(async (command: { input: { Key: { PK: string; SK: string } } }) => {
      const { PK, SK } = command.input.Key;
      if (PK === 'MONTH#2026-01') return { Item: { status: 'DONE' } };
      if (PK === 'MONTH#2026-02' && SK === 'TAB#nsq') return { Item: { status: 'DONE' } };
      return { Item: undefined };
    });

    const { handler } = await import('./check-months');
    const out = await handler();

    expect(out.missingMonths).toEqual(['2026-02']);
    expect(sfnSend).toHaveBeenCalledTimes(1);
    const startInput = JSON.parse(sfnSend.mock.calls[0]![0].input.input);
    expect(startInput).toEqual({ months: ['2026-02'], tabs: ['nsq', 'spurious'], sourceType: 'ENDPOINT' });
    expect(out.startedExecutionArn).toBe('arn:aws:states:...:execution:ingest:1');
  });

  it('starts nothing when every available month is fully DONE', async () => {
    listAvailableMonths.mockImplementation(async (year: number) => (year === 2026 ? ['2026-01'] : []));
    docSend.mockResolvedValue({ Item: { status: 'DONE' } });

    const { handler } = await import('./check-months');
    const out = await handler();

    expect(out.missingMonths).toEqual([]);
    expect(out.startedExecutionArn).toBeUndefined();
    expect(sfnSend).not.toHaveBeenCalled();
  });
});
