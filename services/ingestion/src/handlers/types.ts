import type { Category, IngestionSourceType } from '@asli/contracts';
import type { CdscoTab } from '../cdsco';

/** Execution input for `asli-<stage>-ingest` (docs/ARCHITECTURE.md, this task's Deliverable 2). */
export interface IngestExecutionInput {
  months: string[];
  tabs: CdscoTab[];
  sourceType: IngestionSourceType;
  /** Required when sourceType is FIXTURE - S3 key under the raw bucket's `fixtures/demo/` prefix. */
  fixtureKey?: string;
}

/** One month x tab unit of work, iterated by the Map state (maxConcurrency 1). */
export interface WorkItem {
  month: string;
  tab: CdscoTab;
  sourceType: IngestionSourceType;
  fixtureKey?: string;
}

export interface ExpandWorkOutput {
  items: WorkItem[];
}

/** Output of FetchMonth/LoadFixture - everything NormalizeAndWrite needs. */
export interface FetchedWork extends WorkItem {
  category: Category;
  alertMonth: string;
  sourceUrl: string;
  snapshotKey: string;
  /** S3 key (raw bucket) holding this fetch's ParsedRow[] JSON, read back by NormalizeAndWrite. */
  parsedRowsKey: string;
  rowCount: number;
  demo: boolean;
}

export interface NormalizedWork extends WorkItem {
  category: Category;
  alertMonth: string;
  snapshotKey?: string;
  writtenCount: number;
  collisionCount: number;
  skippedCount: number;
}

export interface MarkFailedInput extends WorkItem {
  error?: { Error?: string; Cause?: string };
  reason?: string;
}
