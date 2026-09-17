import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import alertEventsFixture from '../fixtures/alert-events.json';
import cabinetsFixture from '../fixtures/cabinets.json';
import flaggedBatchesFixture from '../fixtures/flagged-batches.json';
import scanResponsesFixture from '../fixtures/scan-responses.json';
import statsFixture from '../fixtures/stats.json';
import { AlertEventSchema } from './events';
import {
  CabinetMetaItemSchema,
  FlaggedBatchSchema,
  InviteItemSchema,
  MatchItemSchema,
  MedicineItemSchema,
  MemberItemSchema,
  StatsItemSchema,
} from './items';
import { ScanResponseSchema } from './api';

describe('fixtures validate against their schemas', () => {
  it('flagged-batches.json', () => {
    const rows = z.array(FlaggedBatchSchema).parse(flaggedBatchesFixture);
    expect(rows.length).toBeGreaterThanOrEqual(40);
    expect(rows.filter((r) => r.category === 'SPURIOUS').length).toBeGreaterThanOrEqual(3);
  });

  it('cabinets.json', () => {
    z.array(CabinetMetaItemSchema).parse(cabinetsFixture.cabinets);
    z.array(MemberItemSchema).parse(cabinetsFixture.members);
    z.array(InviteItemSchema).parse(cabinetsFixture.invites);
    z.array(MedicineItemSchema).parse(cabinetsFixture.medicines);
    z.array(MatchItemSchema).parse(cabinetsFixture.matches);
  });

  it('alert-events.json', () => {
    z.array(AlertEventSchema).parse(alertEventsFixture);
  });

  it('scan-responses.json - one per result-card state in UX.md', () => {
    const wrapper = z.array(z.object({ state: z.string(), response: ScanResponseSchema }));
    const parsed = wrapper.parse(scanResponsesFixture);
    const states = new Set(parsed.map((p) => p.state));
    for (const expected of [
      'FLAGGED_NSQ',
      'FLAGGED_SPURIOUS',
      'VERIFY_NEAR_BATCH',
      'VERIFY_MANUFACTURER_UNKNOWN',
      'VERIFY_LOW_READ_CONFIDENCE',
      'NO_ALERT_FOUND',
      'EXTRACTION_FAILED_MANUAL_ENTRY',
      'NOT_A_MEDICINE_PHOTO',
    ]) {
      expect(states.has(expected)).toBe(true);
    }
  });

  it('stats.json', () => {
    z.array(StatsItemSchema).parse(statsFixture);
  });
});
