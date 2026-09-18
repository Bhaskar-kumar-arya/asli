import type { S3Client } from '@aws-sdk/client-s3';
import type { AliasMap } from '@asli/matching';
import type { Category, ReasonCode } from '@asli/contracts';

export type CdscoTab = 'nsq' | 'spurious';

/** docs/DATA_SOURCES.md §3: every raw response is saved to S3 before parsing. */
export interface RawSnapshot {
  key: string;
  sha256: string;
  url: string;
  contentType: string;
}

/** The parsed JSON body handed to parseSnapshot, plus the metadata needed to normalize it. */
export interface RawSnapshotBody {
  /** The raw HTTP response text (DataTables-style JSON despite the text/plain content type). */
  text: string;
}

export interface SnapshotMeta {
  month: string; // "YYYY-MM"
  tab: CdscoTab;
  sourceUrl: string;
  snapshotKey: string;
}

/**
 * One CDSCO table row, column-mapped but not yet normalized. Carries the
 * snapshot's alertMonth/sourceUrl/snapshotKey so normalizeRows can stay a pure
 * function of `rows` + `deps` (aliases, reasonClassifier) as this lane's
 * published interface promises - the fetch-time metadata travels with each row
 * instead of as a third parameter.
 */
export interface ParsedRow {
  productName: string;
  batchRaw: string;
  mfgRaw: string;
  expRaw: string;
  manufacturerRaw: string;
  reasonRaw: string;
  reportingSourceRaw: string;
  reportingLab: string;
  category: Category;
  alertMonth: string; // "YYYY-MM"
  sourceUrl: string;
  snapshotKey: string;
}

/** Injected by A2 for reasonRaw values the keyword rules don't cover; must return an enum value. */
export type ReasonClassifier = (reasonRaw: string) => Promise<ReasonCode> | ReasonCode;

export interface NormalizeDeps {
  aliases?: AliasMap;
  reasonClassifier?: ReasonClassifier;
}

export interface FetchMonthDeps {
  s3Client: S3Client;
  bucketName: string;
  userAgent?: string;
  /** Overridable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Overridable for tests so rate-limit/backoff tests don't need real time. */
  sleepImpl?: (ms: number) => Promise<void>;
}
