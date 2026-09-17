import { describe, expect, it } from 'vitest';
import { decide } from './index';

describe('matching package scaffold', () => {
  it('builds and runs', () => {
    const result = decide({ batchNumber: 'X', source: 'manual' }, [], { monthCount: 0, latestMonth: '2025-01' });
    expect(result.tier).toBe('NO_ALERT_FOUND');
  });
});
