import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 30_000;

/** Polls `onPoll` every 3s, up to 30s total, while `pending` is true. docs/UX.md screen 2. */
export function usePendingPoll(pending: boolean, onPoll: () => void): void {
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!pending) return;

    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start >= POLL_TIMEOUT_MS) {
        clearInterval(interval);
        return;
      }
      onPollRef.current();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pending]);
}
