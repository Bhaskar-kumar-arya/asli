import { beforeEach, describe, expect, it, vi } from 'vitest';

const docSend = vi.fn();
const snsSend = vi.fn();

vi.mock('../lib/ddb', () => ({ createDocClient: () => ({ send: docSend }) }));
vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: vi.fn().mockImplementation(() => ({ send: snsSend })),
  PublishCommand: vi.fn((input: unknown) => ({ input })),
}));

describe('mark-failed handler', () => {
  beforeEach(() => {
    docSend.mockReset().mockResolvedValue({});
    snsSend.mockReset().mockResolvedValue({});
    process.env.INGESTION_STATE_TABLE = 'asli-dev-a2-ingestion-state';
    process.env.OPS_TOPIC_ARN = 'arn:aws:sns:ap-south-1:111111111111:asli-dev-a2-ops';
  });

  it('marks IngestionState FAILED and publishes to the ops topic, never throwing itself', async () => {
    const { handler } = await import('./mark-failed');
    const out = await handler({
      month: '2026-02',
      tab: 'nsq',
      sourceType: 'ENDPOINT',
      error: { Error: 'Error', Cause: 'CDSCO GET failed: HTTP 500' },
    });

    expect(docSend).toHaveBeenCalledTimes(1);
    const ddbCommand = docSend.mock.calls[0]![0];
    expect(ddbCommand.input.Item.status).toBe('FAILED');
    expect(ddbCommand.input.Item.error).toContain('HTTP 500');

    expect(snsSend).toHaveBeenCalledTimes(1);
    const snsCommand = snsSend.mock.calls[0]![0];
    expect(snsCommand.input.TopicArn).toBe('arn:aws:sns:ap-south-1:111111111111:asli-dev-a2-ops');
    expect(snsCommand.input.Message).toContain('2026-02');

    expect(out).toEqual({ month: '2026-02', tab: 'nsq', status: 'FAILED' });
  });

  it('falls back to a generic message when neither error nor reason is present', async () => {
    const { handler } = await import('./mark-failed');
    await handler({ month: '2026-03', tab: 'spurious', sourceType: 'PDF' });

    const ddbCommand = docSend.mock.calls[0]![0];
    expect(ddbCommand.input.Item.error).toBe('Unknown ingestion failure');
  });

  it('uses the Pass-state reason for the PDF-not-implemented placeholder', async () => {
    const { handler } = await import('./mark-failed');
    await handler({
      month: '2026-03',
      tab: 'nsq',
      sourceType: 'PDF',
      reason: 'PDF_NOT_IMPLEMENTED: lane A3 has not merged the PDF/Textract fallback yet',
    });

    const ddbCommand = docSend.mock.calls[0]![0];
    expect(ddbCommand.input.Item.error).toContain('PDF_NOT_IMPLEMENTED');
  });
});
