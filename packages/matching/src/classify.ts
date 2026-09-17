import type { FlaggedBatch, MatchReasonCode, MedicineIdentity } from '@asli/contracts';
import { batchSkeleton, normalizeBatch, normalizeManufacturer } from './normalize';
import { classifyMfrSimilarity, manufacturerSimilarity, MFR_SIMILARITY_THRESHOLDS } from './similarity';
import type { CandidateMatch, MatchContext } from './types';

const LOW_READ_CONFIDENCE_THRESHOLD = 0.7;

/** "Expiry contradictory" per docs/MATCHING.md: both known and not equal. Missing expiry is never contradictory. */
function expiryContradicts(identity: MedicineIdentity, candidate: FlaggedBatch): boolean {
  if (!identity.expMonth || !candidate.expMonth) return false;
  return identity.expMonth !== candidate.expMonth;
}

/** docs/MATCHING.md classifyMatch - the per-candidate tier table. */
export function classifyMatch(identity: MedicineIdentity, candidate: FlaggedBatch, ctx: MatchContext): CandidateMatch {
  const batchNorm = normalizeBatch(identity.batchNumber);
  const batchSkel = batchSkeleton(batchNorm);
  const identityMfrNorm = identity.manufacturer ? normalizeManufacturer(identity.manufacturer, ctx.aliases) : '';

  const batchExact = batchNorm === candidate.batchNorm;
  const skeletonMatch = !batchExact && batchSkel === candidate.batchSkeleton;

  let tier: CandidateMatch['tier'] = null;
  let reasonCodes: MatchReasonCode[] = [];
  let collision = false;

  if (batchExact) {
    if (!identity.manufacturer) {
      const brandMatch = (ctx.manufacturerCandidatesForBrand ?? []).find(
        (c) => classifyMfrSimilarity(manufacturerSimilarity(c.manufacturerNorm, candidate.manufacturerNorm)) === 'STRONG',
      );
      if (brandMatch) {
        tier = 'VERIFY';
        reasonCodes = ['BATCH_EXACT', 'MFR_FROM_BRAND_MAP'];
      } else {
        tier = 'VERIFY';
        reasonCodes = ['BATCH_EXACT', 'MFR_UNKNOWN'];
      }
    } else {
      const mfrClass = classifyMfrSimilarity(manufacturerSimilarity(identityMfrNorm, candidate.manufacturerNorm));
      if (mfrClass === 'MISMATCH') {
        tier = null;
        collision = true;
        reasonCodes = [];
      } else if (mfrClass === 'WEAK') {
        tier = 'VERIFY';
        reasonCodes = ['BATCH_EXACT', 'MFR_WEAK'];
      } else if (expiryContradicts(identity, candidate)) {
        tier = 'VERIFY';
        reasonCodes = ['BATCH_EXACT', 'MFR_STRONG', 'EXPIRY_DIFFERS'];
      } else {
        tier = 'FLAGGED';
        reasonCodes = ['BATCH_EXACT', 'MFR_STRONG'];
      }
    }
  } else if (skeletonMatch) {
    const mfrClass = identity.manufacturer
      ? classifyMfrSimilarity(manufacturerSimilarity(identityMfrNorm, candidate.manufacturerNorm))
      : 'MISMATCH';
    if (mfrClass === 'STRONG') {
      tier = 'VERIFY';
      reasonCodes = ['BATCH_NEAR', 'MFR_STRONG'];
    }
  }

  // Low read confidence caps at VERIFY and always adds the reason code, regardless
  // of which branch above produced the raw tier (docs/MATCHING.md "Inputs with
  // low extraction confidence").
  const batchConfidence = identity.fieldConfidence?.batchNumber;
  if (tier !== null && batchConfidence !== undefined && batchConfidence < LOW_READ_CONFIDENCE_THRESHOLD) {
    tier = 'VERIFY';
    reasonCodes = [...reasonCodes, 'LOW_READ_CONFIDENCE'];
  }

  return { candidate, tier, reasonCodes, collision };
}

export { MFR_SIMILARITY_THRESHOLDS };
