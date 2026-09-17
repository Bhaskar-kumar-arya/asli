import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  FlaggedBatchSchema,
  flaggedBatchGsi1Pk,
  flaggedBatchPk,
  type FlaggedBatch,
} from '@asli/contracts';
import { batchSkeleton, normalizeBatch } from '@asli/matching';
import type { CheckedAgainst, Lookup, LookupDeps } from './types';

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * findCandidates(identity) -> FlaggedBatch[] and getCheckedAgainst() (docs/MATCHING.md,
 * docs/DATA_MODEL.md "FlaggedBatches" access patterns). Owned by lane C; F, G2 and N import it.
 */
export function createLookup(deps: LookupDeps): Lookup {
  const now = deps.now ?? Date.now;
  let cache: { value: CheckedAgainst; fetchedAt: number } | undefined;

  return {
    async findCandidates(identity) {
      const batchNorm = normalizeBatch(identity.batchNumber);
      const skeleton = batchSkeleton(batchNorm);

      const [exactResult, nearResult] = await Promise.all([
        deps.ddb.send(
          new QueryCommand({
            TableName: deps.flaggedBatchesTable,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': flaggedBatchPk(batchNorm) },
          }),
        ),
        deps.ddb.send(
          new QueryCommand({
            TableName: deps.flaggedBatchesTable,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: { ':pk': flaggedBatchGsi1Pk(skeleton) },
          }),
        ),
      ]);

      const byAlertId = new Map<string, FlaggedBatch>();
      for (const raw of [...(exactResult.Items ?? []), ...(nearResult.Items ?? [])]) {
        const candidate = FlaggedBatchSchema.parse(raw);
        byAlertId.set(candidate.alertId, candidate);
      }
      return [...byAlertId.values()];
    },

    async getCheckedAgainst() {
      if (cache && now() - cache.fetchedAt < CACHE_TTL_MS) {
        return cache.value;
      }

      const months = new Set<string>();
      let ExclusiveStartKey: Record<string, unknown> | undefined;
      do {
        const result = await deps.ddb.send(
          new ScanCommand({
            TableName: deps.ingestionStateTable,
            FilterExpression: '#status = :done',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':done': 'DONE' },
            ExclusiveStartKey,
          }),
        );
        for (const item of result.Items ?? []) {
          const pk = item.PK as string;
          const month = pk.startsWith('MONTH#') ? pk.slice('MONTH#'.length) : pk;
          months.add(month);
        }
        ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (ExclusiveStartKey);

      const sortedMonths = [...months].sort();
      const value: CheckedAgainst = {
        monthCount: sortedMonths.length,
        latestMonth: sortedMonths.at(-1) ?? '1970-01',
      };
      cache = { value, fetchedAt: now() };
      return value;
    },
  };
}
