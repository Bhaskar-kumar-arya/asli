import type { BillExtraction, BillLineExtraction } from '../extraction-schema';

const HEADER_KEYWORDS: Record<string, RegExp> = {
  batchNumber: /\b(batch|b\.?\s*no|lot)\b/i,
  productName: /\b(item|product|medicine|description|particulars?)\b/i,
  expDate: /\b(exp|expiry)\b/i,
  manufacturer: /\b(mfr|manufacturer|company|maker)\b/i,
  quantity: /\b(qty|quantity)\b/i,
  mrp: /\b(mrp|rate|amount|price)\b/i,
};

const BATCH_TOKEN = /\b[A-Za-z0-9/-]{4,12}\b/g;
const UNIT_TOKEN = /^\d+(\.\d+)?(mg|mcg|ml|g|iu|kg|mm|%)$/i;
const DATE_TOKEN = /\b(\d{1,2}[/.-]\d{2,4}|\d{4}[/.-]\d{1,2}|[A-Za-z]{3,9}[\s-]\d{2,4})\b/;
const QTY_TOKEN = /\bqty\.?\s*[:-]?\s*(\d+)\b/i;
const MRP_TOKEN = /(?:rs\.?|₹|mrp)\s*([0-9]+(?:\.[0-9]{1,2})?)/i;

/** A batch number is alnum with at least one letter and one digit, and not a strength like "500mg". */
function findBatchToken(line: string): RegExpExecArray | undefined {
  BATCH_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BATCH_TOKEN.exec(line))) {
    const token = match[0];
    if (/[A-Za-z]/.test(token) && /[0-9]/.test(token) && !UNIT_TOKEN.test(token)) return match;
  }
  return undefined;
}

function emptyConfidence() {
  return {};
}

/**
 * Textract `AnalyzeDocument` FeatureTypes: ["TABLES"] path, when the bill
 * photo has a clean table. `rows` includes the header row at index 0. Column
 * meaning is inferred from header text, not position, since pharmacy bill
 * layouts vary a lot.
 */
export function parseBillFromTable(rows: string[][]): BillExtraction | null {
  if (rows.length < 2) return null;
  const header = rows[0];
  if (!header) return null;
  const columnFor: Partial<Record<keyof typeof HEADER_KEYWORDS, number>> = {};
  header.forEach((cell, i) => {
    for (const [field, pattern] of Object.entries(HEADER_KEYWORDS)) {
      if (pattern.test(cell) && columnFor[field as keyof typeof HEADER_KEYWORDS] === undefined) {
        columnFor[field as keyof typeof HEADER_KEYWORDS] = i;
      }
    }
  });
  if (columnFor.batchNumber === undefined) return null;

  const lines: BillLineExtraction[] = [];
  for (const row of rows.slice(1)) {
    const cell = (field: keyof typeof HEADER_KEYWORDS): string | undefined => {
      const idx = columnFor[field];
      return idx !== undefined ? row[idx]?.trim() : undefined;
    };
    const batchNumber = cell('batchNumber') || null;
    if (!batchNumber && row.every((c) => !c.trim())) continue;

    const qtyRaw = cell('quantity');
    const quantity = qtyRaw && /^\d+$/.test(qtyRaw) ? Number(qtyRaw) : null;

    lines.push({
      productName: cell('productName') || null,
      batchNumber,
      expDate: cell('expDate') || null,
      manufacturer: cell('manufacturer') || null,
      quantity,
      mrp: cell('mrp') || null,
      confidence: batchNumber ? { batchNumber: 0.7 } : emptyConfidence(),
    });
  }

  return { isPharmacyBill: true, lines };
}

/**
 * Fallback when Textract finds no table structure: treat each OCR line as a
 * candidate medicine row and look for a batch-like token on it. Lines with no
 * such token are dropped (docs/SCANNING.md: "if a line has no batch number,
 * set it to null" - here that means we can't tell it's a medicine line at
 * all, so it never becomes an item; the UI's manual-entry path covers it).
 */
export function parseBillFromLines(lines: string[]): BillExtraction {
  const items: BillLineExtraction[] = [];

  for (const line of lines) {
    if (/\b(total|subtotal|discount|tax|gst|cgst|sgst|patient|doctor|dr\.?)\b/i.test(line)) continue;

    const batchMatch = findBatchToken(line);
    if (!batchMatch) continue;
    const batchNumber = batchMatch[0];

    const expMatch = DATE_TOKEN.exec(line);
    const qtyMatch = QTY_TOKEN.exec(line);
    const mrpMatch = MRP_TOKEN.exec(line);
    const productName = line.slice(0, batchMatch.index).trim().replace(/[|:-]+$/, '').trim() || null;

    items.push({
      productName,
      batchNumber,
      expDate: expMatch?.[1] ?? null,
      manufacturer: null,
      quantity: qtyMatch?.[1] ? Number(qtyMatch[1]) : null,
      mrp: mrpMatch?.[1] ?? null,
      confidence: { batchNumber: 0.4 },
    });
  }

  return { isPharmacyBill: items.length > 0, lines: items };
}
