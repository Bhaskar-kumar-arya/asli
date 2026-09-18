import type { CheckItemResult, FlaggedBatch, MedicineIdentity } from '@asli/contracts';
import { classifyMatch, decide } from '@asli/matching';
import type { AliasMap, BrandManufacturerCandidate } from '@asli/matching';
import type { Lookup } from '@asli/lookup';
import { recordBatchCollisionIgnored, recordCheckTier } from './metrics';

export interface CheckContext {
  lookup: Lookup;
  aliases?: AliasMap;
}

/**
 * Runs the full docs/MATCHING.md pipeline for one identity: fetch candidates,
 * fetch checkedAgainst, decide(). Shared by /v1/checks and /v1/scans so both
 * routes produce identical CheckItemResults for the same identity.
 */
export async function checkIdentity(
  identity: MedicineIdentity,
  ctx: CheckContext,
  manufacturerCandidatesForBrand?: BrandManufacturerCandidate[],
): Promise<CheckItemResult> {
  const [candidates, checkedAgainst] = await Promise.all([
    ctx.lookup.findCandidates(identity),
    ctx.lookup.getCheckedAgainst(),
  ]);

  const matchCtx = {
    monthCount: checkedAgainst.monthCount,
    latestMonth: checkedAgainst.latestMonth,
    aliases: ctx.aliases,
    manufacturerCandidatesForBrand,
  };

  const collisions = countCollisions(identity, candidates, matchCtx);
  recordBatchCollisionIgnored(collisions);

  const result = decide(identity, candidates, matchCtx);
  recordCheckTier(result.tier);
  return result;
}

function countCollisions(
  identity: MedicineIdentity,
  candidates: FlaggedBatch[],
  ctx: Parameters<typeof classifyMatch>[2],
): number {
  return candidates.filter((candidate) => classifyMatch(identity, candidate, ctx).collision).length;
}
