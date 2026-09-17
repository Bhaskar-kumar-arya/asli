import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { z } from 'zod';
import { AlertSummarySchema } from './api';
import { AlertTriggerSchema, TierSchema } from './enums';

/** docs/ALERTS.md - published to SNS `asli-<stage>-alerts`. No personal data beyond IDs and the user-given label. */
export const AlertEventSchema = z.object({
  eventId: z.string(),
  trigger: AlertTriggerSchema,
  cabinetId: z.string(),
  medId: z.string(),
  medicineLabel: z.string().optional(),
  tier: z.enum(['FLAGGED', 'VERIFY']),
  alert: AlertSummarySchema,
  createdAt: z.string().datetime(),
});
export type AlertEvent = z.infer<typeof AlertEventSchema>;

/** SNS message attributes carried alongside the AlertEvent body. */
export const AlertEventMessageAttributesSchema = z.object({
  trigger: AlertTriggerSchema,
  tier: TierSchema,
});
export type AlertEventMessageAttributes = z.infer<typeof AlertEventMessageAttributesSchema>;

/**
 * Parse a DynamoDB Streams record's NEW_IMAGE (or OLD_IMAGE) into a typed item, validating
 * against the given schema. Used by A2/F/G2 stream consumers.
 */
export function parseDynamoImage<T>(
  schema: z.ZodType<T>,
  image: Record<string, AttributeValue> | undefined,
): T {
  if (!image) {
    throw new Error('parseDynamoImage: image is undefined');
  }
  return schema.parse(unmarshall(image));
}

/** eventName on a DynamoDB Streams record. */
export const DynamoEventNameSchema = z.enum(['INSERT', 'MODIFY', 'REMOVE']);
export type DynamoEventName = z.infer<typeof DynamoEventNameSchema>;
