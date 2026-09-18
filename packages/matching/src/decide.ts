import { encodeAlertRef, flaggedBatchPk, flaggedBatchSk } from '@asli/contracts';
import type { AlertSummary, CheckItemResult, FlaggedBatch, MatchReasonCode, MedicineIdentity, Tier } from '@asli/contracts';
import { classifyMatch } from './classify';
import type { CandidateMatch, MatchContext } from './types';

function toAlertSummary(candidate: FlaggedBatch): AlertSummary {
  const alertRef = encodeAlertRef(
    flaggedBatchPk(candidate.batchNorm),
    flaggedBatchSk(candidate.alertMonth, candidate.category, candidate.rowHash),
  );
  return {
    alertRef,
    alertMonth: candidate.alertMonth,
    category: candidate.category,
    productName: candidate.productName,
    batchRaw: candidate.batchRaw,
    manufacturerRaw: candidate.manufacturerRaw,
    mfgMonth: candidate.mfgMonth ?? undefined,
    expMonth: candidate.expMonth ?? undefined,
    reasonCode: candidate.reasonCode,
    reasonRaw: candidate.reasonRaw,
    reportingSource: candidate.reportingSource,
    reportingLab: candidate.reportingLab,
    sourceUrl: candidate.sourceUrl,
    demo: candidate.demo,
  };
}

/**
 * Picks a packages/content template key for the final result. Distinct VERIFY
 * keys per docs/UX.md's result-card states, in a fixed priority order when more
 * than one reason applies at once (e.g. required test case 8: exact-strong match
 * *and* low read confidence - low confidence wins the headline wording).
 */
function guidanceKeyFor(tier: Tier, matched: CandidateMatch[]): string {
  if (tier === 'NO_ALERT_FOUND') return 'result.no_alert_found';

  const reasonCodes = new Set(matched.flatMap((m) => m.reasonCodes));

  if (tier === 'FLAGGED') {
    const hasSpurious = matched.some((m) => m.tier === 'FLAGGED' && m.candidate.category === 'SPURIOUS');
    return hasSpurious ? 'result.flagged.spurious' : 'result.flagged.nsq';
  }

  if (reasonCodes.has('LOW_READ_CONFIDENCE')) return 'result.verify.low_read_confidence';
  if (reasonCodes.has('BATCH_NEAR')) return 'result.verify.near_batch';
  if (reasonCodes.has('MFR_UNKNOWN') || reasonCodes.has('MFR_WEAK') || reasonCodes.has('MFR_FROM_BRAND_MAP')) {
    return 'result.verify.manufacturer_unknown';
  }
  return 'result.verify.default';
}

/** docs/MATCHING.md decide - the overall result for an identity across all candidates. */
export function decide(identity: MedicineIdentity, candidates: FlaggedBatch[], ctx: MatchContext): CheckItemResult {
  const classified = candidates.map((candidate) => classifyMatch(identity, candidate, ctx));
  const matched = classified.filter((c): c is CandidateMatch & { tier: 'FLAGGED' | 'VERIFY' } => c.tier !== null);

  const tier: Tier = matched.some((m) => m.tier === 'FLAGGED')
    ? 'FLAGGED'
    : matched.length > 0
      ? 'VERIFY'
      : 'NO_ALERT_FOUND';

  // SPURIOUS listed first (docs/MATCHING.md "Overall result").
  const sortedMatched = [...matched].sort((a, b) => {
    const aSpurious = a.candidate.category === 'SPURIOUS' ? 0 : 1;
    const bSpurious = b.candidate.category === 'SPURIOUS' ? 0 : 1;
    return aSpurious - bSpurious;
  });

  const matches = sortedMatched.map((m) => toAlertSummary(m.candidate));
  const reasonCodes = [...new Set<MatchReasonCode>(matched.flatMap((m) => m.reasonCodes))];

  return {
    identity,
    tier,
    reasonCodes,
    matches,
    checkedAgainst: { monthCount: ctx.monthCount, latestMonth: ctx.latestMonth },
    guidanceKey: guidanceKeyFor(tier, sortedMatched),
  };
}
