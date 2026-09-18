import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertEvent } from '@asli/contracts';

const sesSend = vi.fn();
vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: vi.fn().mockImplementation(() => ({ send: (...args: unknown[]) => sesSend(...args) })),
  SendEmailCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

const lookupEmail = vi.fn();
vi.mock('../cognito', () => ({
  lookupEmail: (...args: unknown[]) => lookupEmail(...args),
}));

const resolveRecipients = vi.fn();
vi.mock('../recipients', () => ({
  resolveRecipients: (...args: unknown[]) => resolveRecipients(...args),
}));

process.env.IDEMPOTENCY_TABLE_NAME = 'asli-test-idempotency';
process.env.FROM_EMAIL = 'alerts@asli.app';

const { sendEmailToUser, processAlertEvent } = await import('./email-sender');

const alertEvent: AlertEvent = {
  eventId: 'evt-1',
  trigger: 'NEW_ALERT',
  cabinetId: 'cab-1',
  medId: 'med-1',
  medicineLabel: 'Mom - morning tablet',
  tier: 'FLAGGED',
  alert: {
    alertRef: 'ref',
    alertMonth: '2025-03',
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
  createdAt: '2026-09-18T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendEmailToUser', () => {
  it('sends an email when the member has a Cognito email', async () => {
    lookupEmail.mockResolvedValue('asha@example.com');
    sesSend.mockResolvedValue({});

    const result = await sendEmailToUser({ eventId: 'evt-1', userId: 'user-a', channel: 'email', alertEvent });

    expect(result).toEqual({ sent: true });
    expect(sesSend).toHaveBeenCalledTimes(1);
  });

  it('skips sending when no email is found (never fails the batch for a deleted account)', async () => {
    lookupEmail.mockResolvedValue(undefined);

    const result = await sendEmailToUser({ eventId: 'evt-1', userId: 'user-a', channel: 'email', alertEvent });

    expect(result).toEqual({ sent: false });
    expect(sesSend).not.toHaveBeenCalled();
  });
});

describe('processAlertEvent', () => {
  it('sends nothing for a cabinet with no permitted recipients', async () => {
    resolveRecipients.mockResolvedValue([]);

    await processAlertEvent(alertEvent);

    expect(lookupEmail).not.toHaveBeenCalled();
  });
});
