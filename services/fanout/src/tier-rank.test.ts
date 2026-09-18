import { describe, expect, it } from 'vitest';
import { isHigherTier } from './tier-rank';

describe('isHigherTier', () => {
  it('FLAGGED is higher than everything else', () => {
    expect(isHigherTier('FLAGGED', 'VERIFY')).toBe(true);
    expect(isHigherTier('FLAGGED', 'NO_ALERT_FOUND')).toBe(true);
    expect(isHigherTier('FLAGGED', 'PENDING')).toBe(true);
  });

  it('VERIFY is higher than NO_ALERT_FOUND and PENDING but not FLAGGED', () => {
    expect(isHigherTier('VERIFY', 'NO_ALERT_FOUND')).toBe(true);
    expect(isHigherTier('VERIFY', 'PENDING')).toBe(true);
    expect(isHigherTier('VERIFY', 'FLAGGED')).toBe(false);
  });

  it('is never higher than an equal tier', () => {
    expect(isHigherTier('FLAGGED', 'FLAGGED')).toBe(false);
    expect(isHigherTier('VERIFY', 'VERIFY')).toBe(false);
  });

  it('NO_ALERT_FOUND is higher than PENDING but not VERIFY', () => {
    expect(isHigherTier('NO_ALERT_FOUND', 'PENDING')).toBe(true);
    expect(isHigherTier('NO_ALERT_FOUND', 'VERIFY')).toBe(false);
  });
});
