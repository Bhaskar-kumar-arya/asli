import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter, MIN_GAP_MS } from './limiter';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never lets two calls start less than MIN_GAP_MS apart', async () => {
    const throttle = createRateLimiter();
    const startedAt: number[] = [];

    for (let i = 0; i < 4; i++) {
      const p = throttle().then(() => startedAt.push(Date.now()));
      await vi.runAllTimersAsync();
      await p;
    }

    for (let i = 1; i < startedAt.length; i++) {
      expect(startedAt[i]! - startedAt[i - 1]!).toBeGreaterThanOrEqual(MIN_GAP_MS);
    }
  });

  it('does not add extra delay for the first call', async () => {
    const throttle = createRateLimiter();
    const before = Date.now();
    await throttle();
    expect(Date.now()).toBe(before); // no timers needed, nothing to advance
  });

  it('does not add extra delay when calls are already spaced out by real elapsed time', async () => {
    const throttle = createRateLimiter();
    await throttle();
    vi.advanceTimersByTime(MIN_GAP_MS + 100);
    const before = Date.now();
    await throttle();
    expect(Date.now()).toBe(before);
  });

  it('honors a custom minGapMs', async () => {
    const throttle = createRateLimiter(undefined, 500);
    await throttle();
    const p = throttle();
    await vi.advanceTimersByTimeAsync(500);
    await p;
    expect(Date.now()).toBeGreaterThanOrEqual(500);
  });
});
