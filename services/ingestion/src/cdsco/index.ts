// Owned by lane A1. Fetches CDSCO politely, saves raw responses to S3, parses
// into FlaggedBatch[]. No DynamoDB writes, no Step Functions (A2's job),
// no PDF/Textract fallback (A3's job) - see this lane's task file "Out of scope".
export { createCdscoClient, type CdscoClient } from './client';
export { parseSnapshot } from './parser';
export { normalizeRows } from './normalize';
export { classifyReasonByKeyword, defaultReasonClassifier } from './reason-classifier';
export { createRateLimiter, MIN_GAP_MS } from './limiter';
export { politeGet } from './http';
export type {
  CdscoTab,
  FetchMonthDeps,
  NormalizeDeps,
  ParsedRow,
  RawSnapshot,
  RawSnapshotBody,
  ReasonClassifier,
  SnapshotMeta,
} from './types';
