import { describe, expect, it } from 'vitest';
import { CheckItemResultSchema, MedicineIdentitySchema } from './api';
import { TierSchema } from './enums';
import { decodeAlertRef, encodeAlertRef, flaggedBatchPk } from './keys';

describe('contracts package', () => {
  it('exports enums with the expected members', () => {
    expect(TierSchema.options).toEqual(['FLAGGED', 'VERIFY', 'NO_ALERT_FOUND']);
  });

  it('round-trips an alertRef', () => {
    const ref = encodeAlertRef(flaggedBatchPk('GTL1258'), 'ALERT#2025-03#NSQ#abc123');
    expect(decodeAlertRef(ref)).toEqual({ pk: 'BATCH#GTL1258', sk: 'ALERT#2025-03#NSQ#abc123' });
  });

  it('validates a minimal MedicineIdentity', () => {
    const parsed = MedicineIdentitySchema.parse({ batchNumber: 'GTL1258', source: 'manual' });
    expect(parsed.batchNumber).toBe('GTL1258');
  });

  it('rejects a CheckItemResult missing required fields', () => {
    expect(() => CheckItemResultSchema.parse({})).toThrow();
  });
});
