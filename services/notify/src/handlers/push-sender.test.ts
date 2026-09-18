import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertEvent } from '@asli/contracts';

const sendNotification = vi.fn();
const setVapidDetails = vi.fn();
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => setVapidDetails(...args),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}));

const listSubscriptions = vi.fn();
const deleteSubscription = vi.fn();
vi.mock('../subscriptions', () => ({
  listSubscriptions: (...args: unknown[]) => listSubscriptions(...args),
  deleteSubscription: (...args: unknown[]) => deleteSubscription(...args),
}));

vi.mock('../vapid', () => ({
  loadVapidKeys: vi.fn().mockResolvedValue({ publicKey: 'pub', privateKey: 'priv' }),
}));

const resolveRecipients = vi.fn();
vi.mock('../recipients', () => ({
  resolveRecipients: (...args: unknown[]) => resolveRecipients(...args),
}));

process.env.IDEMPOTENCY_TABLE_NAME = 'asli-test-idempotency';

const { sendPushToUser, processAlertEvent } = await import('./push-sender');

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

describe('sendPushToUser', () => {
  it('sends to every subscription for the user', async () => {
    listSubscriptions.mockResolvedValue([
      { endpoint: 'https://push/1', keys: { p256dh: 'a', auth: 'b' } },
      { endpoint: 'https://push/2', keys: { p256dh: 'c', auth: 'd' } },
    ]);
    sendNotification.mockResolvedValue(undefined);

    const result = await sendPushToUser({ eventId: 'evt-1', userId: 'user-a', channel: 'push', alertEvent });

    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it('deletes the subscription on a 410 Gone and still counts it as failed', async () => {
    listSubscriptions.mockResolvedValue([{ endpoint: 'https://push/1', keys: { p256dh: 'a', auth: 'b' } }]);
    sendNotification.mockRejectedValue(Object.assign(new Error('gone'), { statusCode: 410 }));

    const result = await sendPushToUser({ eventId: 'evt-1', userId: 'user-a', channel: 'push', alertEvent });

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(deleteSubscription).toHaveBeenCalledWith('user-a', 'https://push/1');
  });

  it('does not delete the subscription on a non-410/404 error', async () => {
    listSubscriptions.mockResolvedValue([{ endpoint: 'https://push/1', keys: { p256dh: 'a', auth: 'b' } }]);
    sendNotification.mockRejectedValue(Object.assign(new Error('server error'), { statusCode: 500 }));

    await sendPushToUser({ eventId: 'evt-1', userId: 'user-a', channel: 'push', alertEvent });

    expect(deleteSubscription).not.toHaveBeenCalled();
  });

  it('skips users with no subscriptions without calling web-push', async () => {
    listSubscriptions.mockResolvedValue([]);

    const result = await sendPushToUser({ eventId: 'evt-1', userId: 'user-a', channel: 'push', alertEvent });

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(sendNotification).not.toHaveBeenCalled();
  });
});

describe('processAlertEvent', () => {
  it('sends nothing when a member has alerts off (resolveRecipients already filtered them out)', async () => {
    resolveRecipients.mockResolvedValue([]);

    await processAlertEvent(alertEvent);

    expect(listSubscriptions).not.toHaveBeenCalled();
  });
});
