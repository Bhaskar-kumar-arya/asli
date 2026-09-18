/**
 * Guidance template keys (docs/API.md `CheckItemResult.guidanceKey`).
 * Exact values are packages/matching's design decision - see packages/matching/README.md
 * "guidanceKey values this package returns". Kept here as the enum lane I renders templates for.
 */
export const GUIDANCE_KEYS = [
  'result.flagged.nsq',
  'result.flagged.spurious',
  'result.verify.near_batch',
  'result.verify.manufacturer_unknown',
  'result.verify.low_read_confidence',
  'result.verify.default',
  'result.no_alert_found',
] as const;
export type GuidanceKey = (typeof GUIDANCE_KEYS)[number];

/** Non-guidance content keys (notifications, email, result-card UI strings). */
export const NOTIFICATION_KEYS = ['notification.flagged', 'notification.verify'] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

export const EMAIL_KEYS = ['email.flagged.nsq', 'email.flagged.spurious', 'email.verify'] as const;
export type EmailKey = (typeof EMAIL_KEYS)[number];

export type ContentLang = 'en' | 'hi' | 'kn';
export const CONTENT_LANGS: ContentLang[] = ['en', 'hi', 'kn'];
