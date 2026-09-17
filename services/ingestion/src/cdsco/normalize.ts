import { createHash } from 'node:crypto';
import { FlaggedBatchSchema, type FlaggedBatch } from '@asli/contracts';
import { applyAlias, batchSkeleton, normalizeBatch, normalizeManufacturer, parseMonth } from '@asli/matching';
import { classifyReasonByKeyword } from './reason-classifier';
import type { NormalizeDeps, ParsedRow } from './types';

function mapReportingSource(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('state')) return 'STATE_LAB';
  if (lower.includes('central') || lower.includes('cdsco')) return 'CENTRAL_LAB';
  return 'UNKNOWN';
}

function rowHashOf(
  alertMonth: string,
  category: string,
  batchNorm: string,
  manufacturerNorm: string,
  productName: string,
): string {
  return createHash('sha256')
    .update(`${alertMonth}${category}${batchNorm}${manufacturerNorm}${productName}`)
    .digest('hex');
}

/**
 * docs/DATA_SOURCES.md §3/§4. Rows missing a batch number are dropped rather
 * than failing the whole month (task acceptance criterion) - the caller can
 * recover the skipped count as `rows.length - result.length`.
 * Async because `deps.reasonClassifier` (A2's Bedrock-backed fallback for
 * reasonRaw values the keyword rules don't cover) is inherently an I/O call;
 * this lane's own default classifier never needs it.
 */
export async function normalizeRows(rows: ParsedRow[], deps: NormalizeDeps = {}): Promise<FlaggedBatch[]> {
  const out: FlaggedBatch[] = [];

  for (const row of rows) {
    const batchNorm = normalizeBatch(row.batchRaw);
    if (!batchNorm) continue; // missing/unusable batch number - skip, don't throw away the month

    const manufacturerNorm = applyAlias(normalizeManufacturer(row.manufacturerRaw), deps.aliases);
    const { productName, alertMonth, category } = row;

    const reasonCode = classifyReasonByKeyword(row.reasonRaw) ?? (await deps.reasonClassifier?.(row.reasonRaw)) ?? 'OTHER';

    const rowHash = rowHashOf(alertMonth, category, batchNorm, manufacturerNorm, productName);

    const batch: FlaggedBatch = {
      productName,
      batchRaw: row.batchRaw,
      batchNorm,
      batchSkeleton: batchSkeleton(batchNorm),
      mfgMonth: parseMonth(row.mfgRaw),
      expMonth: parseMonth(row.expRaw),
      manufacturerRaw: row.manufacturerRaw,
      manufacturerNorm,
      category,
      reasonRaw: row.reasonRaw,
      reasonCode,
      reportingSource: mapReportingSource(row.reportingSourceRaw),
      reportingLab: row.reportingLab || undefined,
      alertMonth,
      sourceUrl: row.sourceUrl,
      snapshotKey: row.snapshotKey,
      rowHash,
      alertId: rowHash,
      ingestedAt: new Date().toISOString(),
      demo: false,
    };

    out.push(FlaggedBatchSchema.parse(batch));
  }

  return out;
}
