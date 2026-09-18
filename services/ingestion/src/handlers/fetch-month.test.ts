import { beforeEach, describe, expect, it, vi } from 'vitest';

const s3Send = vi.fn();
const fetchMonth = vi.fn();
const parseSnapshot = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: s3Send })),
  PutObjectCommand: vi.fn((input: unknown) => ({ input })),
}));
vi.mock('../cdsco', () => ({
  createCdscoClient: () => ({ fetchMonth }),
  parseSnapshot,
}));

describe('fetch-month handler (ENDPOINT branch)', () => {
  beforeEach(() => {
    s3Send.mockReset().mockResolvedValue({});
    fetchMonth.mockReset();
    parseSnapshot.mockReset();
    process.env.RAW_BUCKET_NAME = 'asli-dev-a2-raw';
  });

  it('fetches via A1, parses, stashes ParsedRow[] in S3, and reports the row count', async () => {
    fetchMonth.mockResolvedValue({
      key: 'raw/cdsco/endpoint/2026-02/nsq/abc.json',
      sha256: 'abc',
      url: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq',
      contentType: 'application/json',
      body: '{"aaData":[]}',
    });
    parseSnapshot.mockReturnValue([{ productName: 'X' }, { productName: 'Y' }]);

    const { handler } = await import('./fetch-month');
    const out = await handler({ month: '2026-02', tab: 'nsq', sourceType: 'ENDPOINT' });

    expect(fetchMonth).toHaveBeenCalledWith('2026-02', 'nsq');
    expect(s3Send).toHaveBeenCalledTimes(1);
    const putCommand = s3Send.mock.calls[0]![0];
    expect(putCommand.input.Key).toBe('raw/cdsco/parsed/2026-02/nsq/rows.json');
    expect(JSON.parse(putCommand.input.Body)).toHaveLength(2);

    expect(out.category).toBe('NSQ');
    expect(out.demo).toBe(false);
    expect(out.rowCount).toBe(2);
    expect(out.snapshotKey).toBe('raw/cdsco/endpoint/2026-02/nsq/abc.json');
  });

  it('maps the spurious tab to the SPURIOUS category', async () => {
    fetchMonth.mockResolvedValue({
      key: 'k',
      sha256: 's',
      url: 'u',
      contentType: 'application/json',
      body: '{"aaData":[]}',
    });
    parseSnapshot.mockReturnValue([]);

    const { handler } = await import('./fetch-month');
    const out = await handler({ month: '2026-02', tab: 'spurious', sourceType: 'ENDPOINT' });
    expect(out.category).toBe('SPURIOUS');
  });
});
