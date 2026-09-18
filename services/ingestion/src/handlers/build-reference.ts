import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  referenceAliasGsi1Pk,
  referenceAliasSk,
  referenceBrandMfrSk,
  referenceBrandPk,
  referenceManufacturerPk,
} from '@asli/contracts';
import { classifyMfrSimilarity, manufacturerSimilarity } from '@asli/matching';
import { requireEnv } from '../lib/env';

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

interface FlaggedBatchRow {
  manufacturerNorm: string;
  productName: string;
  rowHash: string;
}

async function scanFlaggedBatches(tableName: string): Promise<FlaggedBatchRow[]> {
  const rows: FlaggedBatchRow[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const res = await doc.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: 'manufacturerNorm, productName, rowHash',
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    for (const item of res.Items ?? []) {
      rows.push(item as FlaggedBatchRow);
    }
    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return rows;
}

const DOSAGE_WORDS = new Set([
  'MG',
  'ML',
  'MCG',
  'IU',
  'TABLET',
  'TABLETS',
  'CAPSULE',
  'CAPSULES',
  'INJECTION',
  'SYRUP',
  'SUSPENSION',
  'CREAM',
  'OINTMENT',
  'GEL',
  'DROPS',
  'SOLUTION',
]);

/** Leading brand token(s) of a productName, before strength/dosage words (this task's Deliverable 7b). */
export function brandTokenOf(productName: string): string {
  const tokens = productName.toUpperCase().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const t of tokens) {
    if (/^\d/.test(t)) break;
    if (DOSAGE_WORDS.has(t.replace(/[^A-Z]/g, ''))) break;
    out.push(t);
    if (out.length >= 2) break;
  }
  return out.join(' ');
}

interface UncertainPair {
  a: string;
  b: string;
  score: number;
}

/** Union-find so STRONG-similarity manufacturers merge into one alias group per this task's Deliverable 7a. */
function groupByStrongSimilarity(manufacturers: string[]): {
  groups: Map<string, string[]>;
  uncertainPairs: UncertainPair[];
} {
  const parent = new Map<string, string>(manufacturers.map((m) => [m, m]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const uncertainPairs: UncertainPair[] = [];
  for (let i = 0; i < manufacturers.length; i++) {
    for (let j = i + 1; j < manufacturers.length; j++) {
      const a = manufacturers[i]!;
      const b = manufacturers[j]!;
      const score = manufacturerSimilarity(a, b);
      const cls = classifyMfrSimilarity(score);
      if (cls === 'STRONG') union(a, b);
      else if (cls === 'WEAK') uncertainPairs.push({ a, b, score });
    }
  }

  const groups = new Map<string, string[]>();
  for (const m of manufacturers) {
    const root = find(m);
    const list = groups.get(root) ?? [];
    list.push(m);
    groups.set(root, list);
  }
  return { groups, uncertainPairs };
}

export interface BuildReferenceOutput {
  aliasesWritten: number;
  brandCandidatesWritten: number;
  uncertainPairs: number;
}

/**
 * Runs after each ingestion (this task's Deliverable 7). Rebuilds the whole
 * Reference alias/brand map from a fresh scan every time rather than
 * incrementally - FlaggedBatches is small enough for the hackathon's scale
 * that a full scan + rewrite is simpler and self-healing (a bad alias never
 * lingers once its evidence changes).
 */
export async function handler(): Promise<BuildReferenceOutput> {
  const flaggedBatchesTable = requireEnv('FLAGGED_BATCHES_TABLE');
  const referenceTable = requireEnv('REFERENCE_TABLE');
  const rawBucketName = requireEnv('RAW_BUCKET_NAME');

  const rows = await scanFlaggedBatches(flaggedBatchesTable);

  // ---- Manufacturer aliasing ----
  const mfrCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.manufacturerNorm) continue;
    mfrCounts.set(row.manufacturerNorm, (mfrCounts.get(row.manufacturerNorm) ?? 0) + 1);
  }
  const manufacturers = [...mfrCounts.keys()];
  const { groups, uncertainPairs } = groupByStrongSimilarity(manufacturers);

  // Canonical name per manufacturer, used for both the alias rows below and to
  // collapse STRONG-similarity variants (e.g. "Sunrise" / "Sunrise Pharma")
  // into one BRAND#/MFR# candidate rather than splitting their evidence.
  const canonicalOf = new Map<string, string>();
  for (const members of groups.values()) {
    const canonical = [...members].sort(
      (a, b) => (mfrCounts.get(b) ?? 0) - (mfrCounts.get(a) ?? 0) || a.localeCompare(b),
    )[0]!;
    for (const m of members) canonicalOf.set(m, canonical);
  }

  let aliasesWritten = 0;
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const canonical = canonicalOf.get(members[0]!)!;
    for (const alias of members) {
      if (alias === canonical) continue;
      await doc.send(
        new PutCommand({
          TableName: referenceTable,
          Item: {
            PK: referenceManufacturerPk(canonical),
            SK: referenceAliasSk(alias),
            GSI1PK: referenceAliasGsi1Pk(alias),
            createdAt: new Date().toISOString(),
          },
        }),
      );
      aliasesWritten += 1;
    }
  }

  // ---- Brand -> manufacturer candidates ----
  const brandMfrEvidence = new Map<string, Map<string, string[]>>();
  const brandTotals = new Map<string, number>();
  for (const row of rows) {
    const brand = brandTokenOf(row.productName);
    if (!brand || !row.manufacturerNorm) continue;
    const canonicalMfr = canonicalOf.get(row.manufacturerNorm) ?? row.manufacturerNorm;
    brandTotals.set(brand, (brandTotals.get(brand) ?? 0) + 1);
    const byMfr = brandMfrEvidence.get(brand) ?? new Map<string, string[]>();
    const evidence = byMfr.get(canonicalMfr) ?? [];
    evidence.push(row.rowHash);
    byMfr.set(canonicalMfr, evidence);
    brandMfrEvidence.set(brand, byMfr);
  }

  let brandCandidatesWritten = 0;
  for (const [brand, byMfr] of brandMfrEvidence.entries()) {
    const total = brandTotals.get(brand) ?? 0;
    for (const [mfr, evidence] of byMfr.entries()) {
      await doc.send(
        new PutCommand({
          TableName: referenceTable,
          Item: {
            PK: referenceBrandPk(brand),
            SK: referenceBrandMfrSk(mfr),
            confidence: total > 0 ? evidence.length / total : 0,
            evidence,
          },
        }),
      );
      brandCandidatesWritten += 1;
    }
  }

  // ---- Uncertain pairs for human review (tools/reference/review.md) ----
  // Written to S3 rather than the repo filesystem (Lambda has no persistent
  // repo checkout) - scripts/reference/export-review.ts pulls this down into
  // tools/reference/review.md for the human, per this task's Deliverable 7a.
  await s3.send(
    new PutObjectCommand({
      Bucket: rawBucketName,
      Key: 'reference/review/latest.json',
      Body: JSON.stringify({ generatedAt: new Date().toISOString(), uncertainPairs }, null, 2),
      ContentType: 'application/json',
    }),
  );

  return { aliasesWritten, brandCandidatesWritten, uncertainPairs: uncertainPairs.length };
}
