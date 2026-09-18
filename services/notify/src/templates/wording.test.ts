import { describe, expect, it } from 'vitest';
import type { AlertEvent } from '@asli/contracts';
import { findBannedWording } from './banned-words';
import { renderPushPayload } from './push';
import { renderEmailContent } from './email';

const baseAlert = {
  alertRef: 'ref-1',
  alertMonth: '2025-03',
  productName: 'Amoxicillin 500mg Capsules',
  batchRaw: 'GTL 1258',
  manufacturerRaw: 'M/s. Gidsha Pharmaceuticals Pvt. Ltd.',
  reasonCode: 'ASSAY',
  reasonRaw: 'Assay (content of the drug) found outside limits',
  reportingSource: 'STATE_LAB',
  reportingLab: 'State Drug Testing Laboratory, Chandigarh',
  sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Mar-2025',
  demo: false,
} as const;

function makeEvent(overrides: Partial<AlertEvent> & { tier: 'FLAGGED' | 'VERIFY' }): AlertEvent {
  return {
    eventId: 'evt-1',
    trigger: 'NEW_ALERT',
    cabinetId: 'cab-1',
    medId: 'med-1',
    medicineLabel: "Mom's morning tablet",
    createdAt: '2026-09-18T00:00:00.000Z',
    alert: { ...baseAlert, category: 'NSQ' },
    ...overrides,
  } as AlertEvent;
}

describe('wording rules (docs/SAFETY_AND_CONTENT.md)', () => {
  const cases: AlertEvent[] = [
    makeEvent({ tier: 'FLAGGED' }),
    makeEvent({ tier: 'FLAGGED', alert: { ...baseAlert, category: 'SPURIOUS' } }),
    makeEvent({ tier: 'VERIFY' }),
  ];

  it.each(cases)('push payload for tier=%s has no banned wording', (event) => {
    const payload = renderPushPayload(event);
    expect(findBannedWording(payload.title)).toEqual([]);
    expect(findBannedWording(payload.body)).toEqual([]);
  });

  it.each(cases)('email content for tier=%s has no banned wording', (event) => {
    const email = renderEmailContent(event);
    expect(findBannedWording(email.subject)).toEqual([]);
    expect(findBannedWording(email.html)).toEqual([]);
    expect(findBannedWording(email.text)).toEqual([]);
  });

  it('never says "safe"', () => {
    expect(findBannedWording('Everything looks safe')).toContain('\\bsafe\\b');
  });

  it('never advises stopping a medicine outright', () => {
    expect(findBannedWording('You should stop taking this medicine')).not.toEqual([]);
  });

  it('allows the reviewed "do not stop" safety instruction', () => {
    expect(findBannedWording("Don't stop taking a prescribed medicine on your own.")).toEqual([]);
  });

  it('SPURIOUS wording never blames the manufacturer directly', () => {
    const event = makeEvent({ tier: 'FLAGGED', alert: { ...baseAlert, category: 'SPURIOUS' } });
    const email = renderEmailContent(event);
    expect(email.html).not.toMatch(/made fake medicine/i);
    expect(email.html).toMatch(/may not have made it/i);
  });

  it('email cites the CDSCO source link', () => {
    const email = renderEmailContent(makeEvent({ tier: 'FLAGGED' }));
    expect(email.html).toContain(baseAlert.sourceUrl);
  });
});
