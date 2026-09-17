import { describe, expect, it } from 'vitest';
import { batchSkeleton, decide, normalizeBatch, normalizeManufacturer, parseMonth } from './index';

describe('package entry point', () => {
  it('re-exports the public API', () => {
    expect(normalizeBatch('GTL 1258')).toBe('GTL1258');
    expect(batchSkeleton('GTL1258')).toBe('6T11258');
    expect(normalizeManufacturer('Cipla Ltd')).toBe('CIPLA');
    expect(parseMonth('Aug-2025')).toBe('2025-08');

    const result = decide({ batchNumber: 'X', source: 'manual' }, [], { monthCount: 0, latestMonth: '2025-01' });
    expect(result.tier).toBe('NO_ALERT_FOUND');
  });
});
