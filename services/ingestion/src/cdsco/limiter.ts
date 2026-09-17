/**
 * Module-level minimum gap enforced between CDSCO requests (docs/DATA_SOURCES.md
 * §3: "at least 2 seconds between requests"). One limiter instance is shared by
 * every call a single client makes, so backfill's Map state (concurrency 1) never
 * bursts requests even across listAvailableMonths + fetchMonth calls.
 */
export const MIN_GAP_MS = 2000;

export function createRateLimiter(
  sleepImpl: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  minGapMs = MIN_GAP_MS,
) {
  let lastCallAt = -Infinity;

  return async function throttle(): Promise<void> {
    const now = Date.now();
    const wait = lastCallAt + minGapMs - now;
    if (wait > 0) {
      await sleepImpl(wait);
    }
    lastCallAt = Date.now();
  };
}
