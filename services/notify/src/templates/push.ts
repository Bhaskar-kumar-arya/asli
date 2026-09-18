import type { AlertEvent } from '@asli/contracts';
import { assertNoBannedWording } from './banned-words';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  tier: 'FLAGGED' | 'VERIFY';
}

/**
 * docs/ALERTS.md "Web push" wording. `packages/content` (lane I) isn't merged yet, so this is
 * the documented English fallback - swap for a `packages/content` lookup once I ships without
 * changing callers (renderPushPayload's signature stays the same).
 */
export function renderPushPayload(event: AlertEvent): PushPayload {
  const label = event.medicineLabel ?? 'this batch';
  const title = event.tier === 'FLAGGED' ? `Batch alert for ${label}` : `Please check ${label} with your pharmacist`;
  const body =
    event.tier === 'FLAGGED'
      ? `CDSCO reported batch ${event.alert.batchRaw} in ${event.alert.alertMonth}. Open the app for details.`
      : `This looks similar to a batch on a CDSCO alert list. Open the app for details.`;

  assertNoBannedWording(title);
  assertNoBannedWording(body);

  return {
    title,
    body,
    url: `/cabinets/${event.cabinetId}/medicines/${event.medId}`,
    tag: event.eventId,
    tier: event.tier,
  };
}
