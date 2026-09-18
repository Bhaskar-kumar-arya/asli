import type { AlertTrigger } from '@asli/contracts';

const NOTIFY_WINDOW_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * docs/ALERTS.md / this task's "Backfill guard": a backfill (or any late-arriving ingestion,
 * ENDPOINT or PDF) can insert FlaggedBatches rows for months long past - MATCH items are still
 * created for those (retroactive check already covers saved medicines), but we don't want to
 * push a notification for a months-old alert as if it just happened. We gate on `alertMonth`'s
 * own age rather than trying to detect "is this execution a backfill" (IngestionState.sourceType
 * is ENDPOINT for both the daily run and a backfill run, so it can't tell them apart) - age is
 * simpler, deterministic per row, and needs no extra lookup in the stream consumer's hot path.
 * DEMO rows always notify regardless of age (docs/ALERTS.md "Demo path" replays a real past alert
 * on purpose).
 */
export function shouldNotify(alertMonth: string, trigger: AlertTrigger, now: Date = new Date()): boolean {
  if (trigger === 'DEMO') return true;

  const [year, month] = alertMonth.split('-').map(Number) as [number, number];
  const monthStart = Date.UTC(year, month - 1, 1);
  const ageDays = (now.getTime() - monthStart) / MS_PER_DAY;
  return ageDays <= NOTIFY_WINDOW_DAYS;
}
