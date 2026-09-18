// Owned by lane B. Deterministic tier decision (FLAGGED / VERIFY / NO_ALERT_FOUND) goes here.
// No LLM may decide or influence a tier - see CLAUDE.md rule 1.
export { buildAliasMap, applyAlias } from './alias';
export { classifyMatch } from './classify';
export { decide } from './decide';
export { batchSkeleton, normalizeBatch, normalizeManufacturer, parseMonth } from './normalize';
export { classifyMfrSimilarity, manufacturerSimilarity, MFR_SIMILARITY_THRESHOLDS } from './similarity';
export type {
  AliasMap,
  BrandManufacturerCandidate,
  CandidateMatch,
  MatchContext,
  MfrSimilarityClass,
} from './types';
