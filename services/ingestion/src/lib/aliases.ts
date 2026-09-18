import { ScanCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { buildAliasMap, type AliasMap } from '@asli/matching';

/**
 * Loads every Reference `MFR#<canonical>` / `ALIAS#<alias>` row (docs/DATA_MODEL.md,
 * written by this lane's build-reference handler) into an AliasMap for
 * normalizeRows. A full-table Scan is fine at this dataset's size (a few
 * hundred manufacturers at most for the hackathon) - Reference has no index
 * that lists "all alias rows" directly since GSI1 is keyed by aliasNorm, not
 * a fixed partition.
 */
export async function loadAliasMap(doc: DynamoDBDocumentClient, tableName: string): Promise<AliasMap> {
  const rows: Array<{ aliasNorm: string; canonicalManufacturerNorm: string }> = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const res = await doc.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: 'begins_with(SK, :aliasPrefix)',
        ExpressionAttributeValues: { ':aliasPrefix': 'ALIAS#' },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    for (const item of res.Items ?? []) {
      const pk = item.PK as string;
      const sk = item.SK as string;
      rows.push({
        canonicalManufacturerNorm: pk.replace(/^MFR#/, ''),
        aliasNorm: sk.replace(/^ALIAS#/, ''),
      });
    }
    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return buildAliasMap(rows);
}
