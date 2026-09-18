import type { AlertEvent } from '@asli/contracts';
import { assertNoBannedWording } from './banned-words';
import { REASON_PLAIN_TEXT } from './reasons';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const WHAT_TO_DO_NEXT = [
  "Don't stop taking a prescribed medicine on your own. Talk to your doctor first.",
  'Keep the strip, carton and bill.',
  'Show this screen to your pharmacist and ask for a replacement from a different batch.',
  'If you notice any side effect or problem, you can report it.',
];

function titleAndBody(event: AlertEvent): { title: string; body: string } {
  const { alert } = event;
  const reasonPlain = REASON_PLAIN_TEXT[alert.reasonCode];

  if (event.tier === 'VERIFY') {
    return {
      title: 'Please check this batch with your pharmacist',
      body: `This looks similar to a batch on a CDSCO alert list, but some details don't fully match. Show this screen and the strip to your pharmacist.`,
    };
  }

  if (alert.category === 'SPURIOUS') {
    return {
      title: 'A batch with this label was reported as spurious',
      body: `CDSCO reported a batch carrying batch number ${alert.batchRaw} and the label of ${alert.manufacturerRaw} as spurious in ${alert.alertMonth}. The real manufacturer may not have made it.`,
    };
  }

  return {
    title: 'This batch is on a CDSCO alert list',
    body: `CDSCO reported batch ${alert.batchRaw} of ${alert.productName} as Not of Standard Quality in ${alert.alertMonth} (${alert.reportingLab ?? alert.reportingSource}). Reason: ${reasonPlain}`,
  };
}

/**
 * docs/ALERTS.md "Email (SES)" / docs/SAFETY_AND_CONTENT.md result-card copy (en). `packages/content`
 * (lane I) isn't merged yet, so this is the documented fallback simple template - swap for a
 * `packages/content` lookup once I ships without changing callers.
 */
export function renderEmailContent(event: AlertEvent): EmailContent {
  const label = event.medicineLabel ?? 'this batch';
  const { title, body } = titleAndBody(event);
  const subject = event.tier === 'FLAGGED' ? `Batch alert for ${label}` : `Please check ${label} with your pharmacist`;
  const sourceUrl = event.alert.sourceUrl;

  const whatToDoNextHtml = WHAT_TO_DO_NEXT.map((step) => `<li>${step}</li>`).join('');
  const whatToDoNextText = WHAT_TO_DO_NEXT.map((step, i) => `${i + 1}. ${step}`).join('\n');

  const html = `
    <h1>${title}</h1>
    <p>${body}</p>
    <h2>What to do next</h2>
    <ol>${whatToDoNextHtml}</ol>
    <p><a href="${sourceUrl}">View CDSCO source</a></p>
    <p><a href="${appUrl(event)}">Open Asli</a></p>
  `.trim();

  const text = [
    title,
    '',
    body,
    '',
    'What to do next:',
    whatToDoNextText,
    '',
    `View CDSCO source: ${sourceUrl}`,
    `Open Asli: ${appUrl(event)}`,
  ].join('\n');

  assertNoBannedWording(subject);
  assertNoBannedWording(html);
  assertNoBannedWording(text);

  return { subject, html, text };
}

function appUrl(event: AlertEvent): string {
  return `/cabinets/${event.cabinetId}/medicines/${event.medId}`;
}
