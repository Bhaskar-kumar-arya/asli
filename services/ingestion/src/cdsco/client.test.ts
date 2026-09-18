import { createHash } from 'node:crypto';
import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';
import { createCdscoClient } from './client';

function fakeS3() {
  const send = vi.fn().mockResolvedValue({});
  return { send } as unknown as S3Client;
}

describe('createCdscoClient.fetchMonth', () => {
  it('builds the exact minimal request T01s spike recorded for the NSQ tab', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"aaData":[]}', { status: 200 }));
    const s3Client = fakeS3();
    const client = createCdscoClient({ s3Client, bucketName: 'asli-dev-a1-raw', fetchImpl, sleepImpl: async () => {} });

    await client.fetchMonth('2026-02', 'nsq');

    const [url] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq');
  });

  it('uses the separate Spurious endpoint, not the tab= param', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"aaData":[]}', { status: 200 }));
    const s3Client = fakeS3();
    const client = createCdscoClient({ s3Client, bucketName: 'asli-dev-a1-raw', fetchImpl, sleepImpl: async () => {} });

    await client.fetchMonth('2026-02', 'spurious');

    const [url] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://cdscoonline.gov.in/CDSCO/filteredSpuriousDrugTable?month=Feb-2026&source=All');
  });

  it('saves the raw response to S3 before returning, keyed by sha256', async () => {
    const body = '{"aaData":[{"str_batch_no":"X"}]}';
    const fetchImpl = vi.fn().mockResolvedValue(new Response(body, { status: 200 }));
    const s3Client = fakeS3();
    const client = createCdscoClient({ s3Client, bucketName: 'asli-dev-a1-raw', fetchImpl, sleepImpl: async () => {} });

    const snap = await client.fetchMonth('2026-02', 'nsq');

    const expectedSha = createHash('sha256').update(body).digest('hex');
    expect(snap.sha256).toBe(expectedSha);
    expect(snap.key).toBe(`raw/cdsco/endpoint/2026-02/nsq/${expectedSha}.json`);
    expect(snap.body).toBe(body);

    expect(s3Client.send).toHaveBeenCalledTimes(1);
    const command = (s3Client.send as ReturnType<typeof vi.fn>).mock.calls[0]![0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input.Bucket).toBe('asli-dev-a1-raw');
    expect(command.input.Key).toBe(snap.key);
    expect(command.input.Body).toBe(body);
  });

  it('retries on failure and only writes to S3 once a response succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(new Response('{"aaData":[]}', { status: 200 }));
    const s3Client = fakeS3();
    const client = createCdscoClient({ s3Client, bucketName: 'asli-dev-a1-raw', fetchImpl, sleepImpl: async () => {} });

    await client.fetchMonth('2026-02', 'nsq');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(s3Client.send).toHaveBeenCalledTimes(1);
  });
});

describe('createCdscoClient.listAvailableMonths', () => {
  it('converts the reportingMonths abbreviation array into YYYY-MM strings', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(['Jan', 'Feb', 'Dec']), { status: 200 }));
    const client = createCdscoClient({ s3Client: fakeS3(), bucketName: 'b', fetchImpl, sleepImpl: async () => {} });

    const months = await client.listAvailableMonths(2025);

    expect(months).toEqual(['2025-01', '2025-02', '2025-12']);
    const [url] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://cdscoonline.gov.in/CDSCO/reportingMonths?year=2025');
  });
});
