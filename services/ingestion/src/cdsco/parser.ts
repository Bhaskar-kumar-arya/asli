import type { Category } from '@asli/contracts';
import type { ParsedRow, RawSnapshotBody, SnapshotMeta } from './types';

/**
 * Both filteredNsqDrugTable and filteredSpuriousDrugTable return DataTables-style
 * JSON (`{iTotalDisplayRecords, iTotalRecords, aaData: [...]}`) despite a
 * `Content-Type: text/plain` header (see plan/tasks/T01-spikes.md Handoff and
 * packages/contracts/fixtures/cdsco/README.md) - there is no HTML to parse, so
 * this doesn't need cheerio as docs/DATA_SOURCES.md anticipated before T01's
 * spike confirmed the real response shape.
 */
interface DataTablesResponse {
  iTotalDisplayRecords: number;
  iTotalRecords: number;
  aaData: Record<string, string>[];
}

/**
 * The Spurious endpoint uses `product_name_from_dtl` instead of `str_product_name`
 * and adds a few Spurious-only fields; every other column name is shared.
 */
function productNameOf(row: Record<string, string>): string {
  return (row.str_product_name ?? row.product_name_from_dtl ?? '').trim();
}

export function parseSnapshot(snap: RawSnapshotBody, meta: SnapshotMeta): ParsedRow[] {
  const category: Category = meta.tab === 'nsq' ? 'NSQ' : 'SPURIOUS';
  let parsed: DataTablesResponse;
  try {
    parsed = JSON.parse(snap.text) as DataTablesResponse;
  } catch (err) {
    throw new Error(`CDSCO snapshot for ${meta.month}/${meta.tab} is not valid JSON: ${(err as Error).message}`);
  }

  return (parsed.aaData ?? []).map((row) => ({
    productName: productNameOf(row),
    batchRaw: (row.str_batch_no ?? '').trim(),
    mfgRaw: (row.dt_manufacturing_date ?? '').trim(),
    expRaw: (row.dt_expiry_date ?? '').trim(),
    manufacturerRaw: (row.str_manufactured_by ?? '').trim(),
    reasonRaw: (row.str_nsq_result ?? '').trim(),
    reportingSourceRaw: (row.str_reporting_source ?? '').trim(),
    reportingLab: (row.str_reported_by_lab_or_state ?? '').trim(),
    category,
    alertMonth: meta.month,
    sourceUrl: meta.sourceUrl,
    snapshotKey: meta.snapshotKey,
  }));
}
