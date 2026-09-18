import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface CheckedAgainst {
  monthCount: number;
  latestMonth: string;
}

export interface LookupDeps {
  ddb: DynamoDBDocumentClient;
  flaggedBatchesTable: string;
  ingestionStateTable: string;
  /** Overridable for tests; defaults to Date.now. */
  now?: () => number;
}

export interface Lookup {
  /** By batchNorm (exact) and batchSkeleton (near), deduped by alertId. */
  findCandidates(identity: { batchNumber: string }): Promise<import('@asli/contracts').FlaggedBatch[]>;
  /** Count of DONE ingestion months and the latest one. Cached 5 minutes. */
  getCheckedAgainst(): Promise<CheckedAgainst>;
}
