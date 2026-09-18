import type { SNSEvent, SNSHandler } from 'aws-lambda';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { AlertEventSchema, type AlertEvent } from '@asli/contracts';
import { resolveRecipients } from '../recipients';
import { lookupEmail } from '../cognito';
import { renderEmailContent } from '../templates/email';
import { withIdempotency } from '../idempotency';
import { requiredEnv } from '../ddb';
import { logger, metrics, MetricUnit } from '../observability';

const ses = new SESv2Client({});

interface SendEmailPayload {
  eventId: string;
  userId: string;
  channel: 'email';
  alertEvent: AlertEvent;
}

export async function sendEmailToUser(payload: SendEmailPayload): Promise<{ sent: boolean }> {
  const email = await lookupEmail(payload.userId);
  if (!email) {
    return { sent: false };
  }

  const fromEmail = requiredEnv('FROM_EMAIL');
  const configurationSetName = process.env.SES_CONFIGURATION_SET_NAME;
  const content = renderEmailContent(payload.alertEvent);

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: fromEmail,
      Destination: { ToAddresses: [email] },
      ConfigurationSetName: configurationSetName,
      Content: {
        Simple: {
          Subject: { Data: content.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: content.html, Charset: 'UTF-8' },
            Text: { Data: content.text, Charset: 'UTF-8' },
          },
        },
      },
    }),
  );

  return { sent: true };
}

const sendEmailToUserIdempotent = withIdempotency(sendEmailToUser);

export async function processAlertEvent(alertEvent: AlertEvent): Promise<void> {
  const recipients = await resolveRecipients(alertEvent.cabinetId);
  let emailSent = 0;
  let emailFailed = 0;

  for (const recipient of recipients) {
    try {
      const result = await sendEmailToUserIdempotent({
        eventId: alertEvent.eventId,
        userId: recipient.userId,
        channel: 'email',
        alertEvent,
      });
      if (result.sent) emailSent += 1;
    } catch (err) {
      emailFailed += 1;
      logger.error('email send failed', { eventId: alertEvent.eventId, cabinetId: alertEvent.cabinetId });
      throw err;
    }
  }

  metrics.addMetric('emailSent', MetricUnit.Count, emailSent);
  metrics.addMetric('emailFailed', MetricUnit.Count, emailFailed);
  logger.info('processed AlertEvent for email', {
    eventId: alertEvent.eventId,
    cabinetId: alertEvent.cabinetId,
    recipientCount: recipients.length,
    emailSent,
    emailFailed,
  });
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    const alertEvent = AlertEventSchema.parse(JSON.parse(record.Sns.Message));
    await processAlertEvent(alertEvent);
  }
  metrics.publishStoredMetrics();
};
