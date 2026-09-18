import type { FlaggedBatch, MatchReasonCode, Tier } from '@asli/contracts';

/** aliasNorm -> canonical manufacturerNorm. See docs/MATCHING.md normalizeManufacturer step 6. */
export type AliasMap = Record<string, string>;

/** A Reference BRAND# candidate for an identity with a brand/product name but no manufacturer (docs/SCANNING.md post-processing). */
export interface BrandManufacturerCandidate {
  manufacturerNorm: string;
  confidence: number;
}

/**
 * Everything decide()/classifyMatch() need that isn't fetched from I/O themselves
 * (packages/matching does no I/O - callers fetch candidates, alias map, and month
 * count from DynamoDB and pass them in).
 */
export interface MatchContext {
  /** How many CDSCO lists have been checked, and the most recent one - see docs/MATCHING.md checkedAgainst. */
  monthCount: number;
  latestMonth: string;
  aliases?: AliasMap;
  /** Only consulted when identity.manufacturer is empty - docs/MATCHING.md tier table row 4. */
  manufacturerCandidatesForBrand?: BrandManufacturerCandidate[];
}

/** Per-candidate classification result - docs/MATCHING.md "Tiers (per candidate)". */
export interface CandidateMatch {
  candidate: FlaggedBatch;
  /** null = no match for this candidate (including the ignored batch-collision case). */
  tier: Exclude<Tier, 'NO_ALERT_FOUND'> | null;
  reasonCodes: MatchReasonCode[];
  /** true only for the batchNorm-equal + manufacturer-MISMATCH case - callers emit metric BatchCollisionIgnored for these. */
  collision: boolean;
}

/** Manufacturer-similarity classification - docs/MATCHING.md manufacturerSimilarity thresholds. */
export type MfrSimilarityClass = 'STRONG' | 'WEAK' | 'MISMATCH';
