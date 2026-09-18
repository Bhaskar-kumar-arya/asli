import { describe, expect, it } from 'vitest';
import { shouldNotify } from './backfill-guard';

const NOW = new Date('2026-09-18T12:00:00.000Z');

describe('shouldNotify', () => {
  it('notifies for the current month', () => {
    expect(shouldNotify('2026-09', 'NEW_ALERT', NOW)).toBe(true);
  });

  it('notifies for an alertMonth within 60 days', () => {
    expect(shouldNotify('2026-08', 'NEW_ALERT', NOW)).toBe(true);
  });

  it('does not notify for an alertMonth older than 60 days', () => {
    expect(shouldNotify('2026-01', 'NEW_ALERT', NOW)).toBe(false);
  });

  it('always notifies for DEMO regardless of age', () => {
    expect(shouldNotify('2024-01', 'DEMO', NOW)).toBe(true);
  });

  it('does not notify for an old RETROACTIVE-style backfill row', () => {
    expect(shouldNotify('2023-06', 'NEW_ALERT', NOW)).toBe(false);
  });
});
