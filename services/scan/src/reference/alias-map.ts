import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { AliasMap } from '@asli/matching';

const CACHE_TTL_MS = 5 * 60 * 1000;

export interface AliasMapDeps {
  ddb: DynamoDBDocumentClient;
  referenceTable: string;
  now?: () => number;
}

/**
 * Loads the full aliasNorm -> canonical manufacturerNorm map (Reference
 * MFR#<canonical>/ALIAS#<alias> items, docs/DATA_MODEL.md) for
 * @asli/matching's normalizeManufacturer. Small, whole-table dataset - cached
 * 5 minutes like getCheckedAgainst.
 */
export function createAliasMapLoader(deps: AliasMapDeps): () => Promise<AliasMap> {
  const now = deps.now ?? Date.now;
  let cache: { value: AliasMap; fetchedAt: number } | undefined;

  return async () => {
    if (cache && now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.value;
    }

    const aliases: AliasMap = {};
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const result = await deps.ddb.send(
        new ScanCommand({
          TableName: deps.referenceTable,
          FilterExpression: 'begins_with(SK, :aliasPrefix)',
          ExpressionAttributeValues: { ':aliasPrefix': 'ALIAS#' },
          ExclusiveStartKey,
        }),
      );
      for (const item of result.Items ?? []) {
        const pk = item.PK as string;
        const sk = item.SK as string;
        if (!pk.startsWith('MFR#') || !sk.startsWith('ALIAS#')) continue;
        const canonical = pk.slice('MFR#'.length);
        const aliasNorm = sk.slice('ALIAS#'.length);
        aliases[aliasNorm] = canonical;
      }
      ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (ExclusiveStartKey);

    cache = { value: aliases, fetchedAt: now() };
    return aliases;
  };
}
