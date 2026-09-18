import type { SNSEvent, SNSHandler } from 'aws-lambda';
import webpush from 'web-push';
import { AlertEventSchema, type AlertEvent } from '@asli/contracts';
import { resolveRecipients } from '../recipients';
import { listSubscriptions, deleteSubscription } from '../subscriptions';
import { loadVapidKeys } from '../vapid';
import { renderPushPayload } from '../templates/push';
import { withIdempotency } from '../idempotency';
import { logger, metrics, MetricUnit } from '../observability';

interface SendPushPayload {
  eventId: string;
  userId: string;
  channel: 'push';
  alertEvent: AlertEvent;
}

export async function sendPushToUser(payload: SendPushPayload): Promise<{ sent: number; failed: number }> {
  const subscriptions = await listSubscriptions(payload.userId);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const vapid = await loadVapidKeys();
  webpush.setVapidDetails('mailto:alerts@asli.app', vapid.publicKey, vapid.privateKey);

  const body = JSON.stringify(renderPushPayload(payload.alertEvent));
  const ttl = 60 * 60 * 24;
  const urgency: webpush.RequestOptions['urgency'] = payload.alertEvent.tier === 'FLAGGED' ? 'high' : 'normal';

  let sent = 0;
  let failed = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        body,
        { TTL: ttl, urgency },
      );
      sent += 1;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await deleteSubscription(payload.userId, subscription.endpoint);
      }
      failed += 1;
    }
  }
  return { sent, failed };
}

const sendPushToUserIdempotent = withIdempotency(sendPushToUser);

export async function processAlertEvent(alertEvent: AlertEvent): Promise<void> {
  const recipients = await resolveRecipients(alertEvent.cabinetId);
  let pushSent = 0;
  let pushFailed = 0;

  for (const recipient of recipients) {
    const result = await sendPushToUserIdempotent({
      eventId: alertEvent.eventId,
      userId: recipient.userId,
      channel: 'push',
      alertEvent,
    });
    pushSent += result.sent;
    pushFailed += result.failed;
  }

  metrics.addMetric('pushSent', MetricUnit.Count, pushSent);
  metrics.addMetric('pushFailed', MetricUnit.Count, pushFailed);
  logger.info('processed AlertEvent for push', {
    eventId: alertEvent.eventId,
    cabinetId: alertEvent.cabinetId,
    recipientCount: recipients.length,
    pushSent,
    pushFailed,
  });
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    const alertEvent = AlertEventSchema.parse(JSON.parse(record.Sns.Message));
    await processAlertEvent(alertEvent);
  }
  metrics.publishStoredMetrics();
};
