import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { referenceBrandPk } from '@asli/contracts';
import type { BrandManufacturerCandidate } from '@asli/matching';

/**
 * Normalizes a brand/product name the same shape as @asli/matching's
 * normalizeManufacturer (NFKC, uppercase, alnum-only) but without the
 * manufacturer-specific stopwords/address stripping - docs/DATA_MODEL.md
 * doesn't specify a brand normalization algorithm, so this is lane C's own
 * minimal, deterministic rule for the Reference BRAND# key.
 */
export function normalizeBrand(raw: string): string {
  return raw
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * docs/SCANNING.md post-processing: "If manufacturer is null and
 * brandName/productName present -> look up Reference BRAND# candidates".
 */
export async function getBrandCandidates(
  ddb: DynamoDBDocumentClient,
  referenceTable: string,
  brandOrProductName: string,
): Promise<BrandManufacturerCandidate[]> {
  const brandNorm = normalizeBrand(brandOrProductName);
  if (!brandNorm) return [];

  const result = await ddb.send(
    new QueryCommand({
      TableName: referenceTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': referenceBrandPk(brandNorm) },
    }),
  );

  return (result.Items ?? []).map((item) => ({
    manufacturerNorm: (item.SK as string).replace(/^MFR#/, ''),
    confidence: item.confidence as number,
  }));
}
