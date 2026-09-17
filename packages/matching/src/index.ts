// Owned by lane B. Deterministic tier decision (FLAGGED / VERIFY / NO_ALERT_FOUND) goes here.
// No LLM may decide or influence a tier - see CLAUDE.md rule 1.
import type { CheckItemResult, FlaggedBatch, MedicineIdentity } from '@asli/contracts';
import type { AliasMap, CandidateMatch, MatchContext } from './types';

export type { AliasMap, BrandManufacturerCandidate, CandidateMatch, MatchContext, MfrSimilarityClass } from './types';

/** docs/MATCHING.md normalizeBatch. STUB - returns input unchanged. */
export function normalizeBatch(raw: string): string {
  return raw;
}

/** docs/MATCHING.md batchSkeleton. STUB - returns input unchanged. */
export function batchSkeleton(norm: string): string {
  return norm;
}

/** docs/MATCHING.md normalizeManufacturer. STUB - returns input unchanged. */
export function normalizeManufacturer(raw: string, _aliases?: AliasMap): string {
  return raw;
}

/** docs/MATCHING.md manufacturerSimilarity. STUB - always returns 0. */
export function manufacturerSimilarity(_a: string, _b: string): number {
  return 0;
}

/** docs/MATCHING.md parseMonth. STUB - always returns null. */
export function parseMonth(_raw: string): string | null {
  return null;
}

/** docs/MATCHING.md classifyMatch. STUB - always "no match". */
export function classifyMatch(
  _identity: MedicineIdentity,
  candidate: FlaggedBatch,
  _ctx: MatchContext,
): CandidateMatch {
  return { candidate, tier: null, reasonCodes: [], collision: false };
}

/** docs/MATCHING.md decide. STUB - always NO_ALERT_FOUND. */
export function decide(identity: MedicineIdentity, _candidates: FlaggedBatch[], ctx: MatchContext): CheckItemResult {
  return {
    identity,
    tier: 'NO_ALERT_FOUND',
    reasonCodes: [],
    matches: [],
    checkedAgainst: { monthCount: ctx.monthCount, latestMonth: ctx.latestMonth },
    guidanceKey: 'result.no_alert_found',
  };
}
