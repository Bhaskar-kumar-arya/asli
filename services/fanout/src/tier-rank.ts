import type { MedicineStatus } from '@asli/contracts';

/** Ranks MedicineStatus so a MED's latestTier only ever moves up, never down. */
const TIER_RANK: Record<MedicineStatus, number> = {
  PENDING: 0,
  NO_ALERT_FOUND: 1,
  VERIFY: 2,
  FLAGGED: 3,
};

export function isHigherTier(candidate: MedicineStatus, current: MedicineStatus): boolean {
  return TIER_RANK[candidate] > TIER_RANK[current];
}
