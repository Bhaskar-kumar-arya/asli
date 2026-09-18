import { beforeEach, describe, expect, it, vi } from 'vitest';

const s3Send = vi.fn();
const parseSnapshot = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: s3Send })),
  GetObjectCommand: vi.fn((input: unknown) => ({ input, kind: 'get' })),
  PutObjectCommand: vi.fn((input: unknown) => ({ input, kind: 'put' })),
}));
vi.mock('../cdsco', () => ({ parseSnapshot }));

function fakeFixtureBody(): { transformToString: () => Promise<string> } {
  const fixture = {
    meta: {
      alertMonth: '2026-02',
      tab: 'nsq',
      sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq',
    },
    aaData: [{ str_product_name: 'X' }],
  };
  return { transformToString: () => Promise.resolve(JSON.stringify(fixture)) };
}

describe('load-fixture handler (FIXTURE branch, demo replay)', () => {
  beforeEach(() => {
    s3Send.mockReset();
    parseSnapshot.mockReset();
    process.env.RAW_BUCKET_NAME = 'asli-int-raw';
  });

  it('reads the fixture, reuses A1s parser, and tags the result demo:true', async () => {
    s3Send.mockResolvedValueOnce({ Body: fakeFixtureBody() }).mockResolvedValueOnce({});
    parseSnapshot.mockReturnValue([{ productName: 'X' }]);

    const { handler } = await import('./load-fixture');
    const out = await handler({
      month: 'DEMO',
      tab: 'nsq',
      sourceType: 'FIXTURE',
      fixtureKey: 'fixtures/demo/replay-1.json',
    });

    expect(parseSnapshot).toHaveBeenCalledWith(
      { text: JSON.stringify({ aaData: [{ str_product_name: 'X' }] }) },
      {
        month: '2026-02',
        tab: 'nsq',
        sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq',
        snapshotKey: 'fixtures/demo/replay-1.json',
      },
    );
    expect(out.demo).toBe(true);
    expect(out.category).toBe('NSQ');
    expect(out.alertMonth).toBe('2026-02');
    expect(out.rowCount).toBe(1);
  });

  it('throws if fixtureKey is missing', async () => {
    const { handler } = await import('./load-fixture');
    await expect(handler({ month: 'DEMO', tab: 'nsq', sourceType: 'FIXTURE' })).rejects.toThrow(/fixtureKey/);
  });
});
