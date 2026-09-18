import { parseMonth } from '@asli/matching';
import type { MedicineIdentity } from '@asli/contracts';
import { ApiError } from './http';

export const MAX_ROWS = 500;
export const CSV_TEMPLATE_HEADER = 'product,batch,manufacturer,expiry,quantity';

const HEADER_ALIASES: Record<string, keyof RowFields> = {
  product: 'product',
  productname: 'product',
  medicine: 'product',
  batch: 'batch',
  batchnumber: 'batch',
  'batchno': 'batch',
  manufacturer: 'manufacturer',
  mfr: 'manufacturer',
  expiry: 'expiry',
  expirydate: 'expiry',
  expdate: 'expiry',
  quantity: 'quantity',
  qty: 'quantity',
};

interface RowFields {
  product: string;
  batch: string;
  manufacturer: string;
  expiry: string;
  quantity: string;
}

/** Splits one CSV line into fields, honoring double-quoted fields with embedded commas/quotes. */
function splitLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export interface PharmacyCsvRow {
  identity: MedicineIdentity;
  /** Set when manufacturer is missing but a product name is present - docs/SCANNING.md post-processing. */
  brandQuery?: string;
}

/**
 * docs/plan/tasks/N-pharmacy-mode.md: CSV columns mapped by header (product,
 * batch, manufacturer, expiry, quantity), any order, case-insensitive.
 * `batch` is the only required column - rows missing it are dropped.
 */
export function parsePharmacyCsv(text: string): PharmacyCsvRow[] {
  const lines = text.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new ApiError('BAD_REQUEST', 'CSV has no rows');
  }

  const headerCells = splitLine(lines[0] ?? '').map(normalizeHeader);
  const columnIndex: Partial<Record<keyof RowFields, number>> = {};
  headerCells.forEach((cell, index) => {
    const field = HEADER_ALIASES[cell];
    if (field) columnIndex[field] = index;
  });

  if (columnIndex.batch === undefined) {
    throw new ApiError('BAD_REQUEST', 'CSV must have a "batch" column');
  }

  const dataLines = lines.slice(1);
  if (dataLines.length > MAX_ROWS) {
    throw new ApiError('BAD_REQUEST', `CSV has more than ${MAX_ROWS} rows`);
  }

  const rows: PharmacyCsvRow[] = [];
  for (const line of dataLines) {
    const cells = splitLine(line);
    const batchNumber = columnIndex.batch !== undefined ? cells[columnIndex.batch]?.trim() : undefined;
    if (!batchNumber) continue;

    const productName = columnIndex.product !== undefined ? cells[columnIndex.product]?.trim() : undefined;
    const manufacturer = columnIndex.manufacturer !== undefined ? cells[columnIndex.manufacturer]?.trim() : undefined;
    const expiryRaw = columnIndex.expiry !== undefined ? cells[columnIndex.expiry]?.trim() : undefined;
    const quantityRaw = columnIndex.quantity !== undefined ? cells[columnIndex.quantity]?.trim() : undefined;

    const expMonth = expiryRaw ? parseMonth(expiryRaw) ?? undefined : undefined;
    const quantity = quantityRaw ? Number.parseInt(quantityRaw, 10) : undefined;

    const identity: MedicineIdentity = {
      ...(productName && { productName }),
      batchNumber,
      ...(manufacturer && { manufacturer }),
      ...(expMonth && { expMonth }),
      ...(quantity !== undefined && Number.isFinite(quantity) && quantity > 0 && { quantity }),
      source: 'pharmacy_csv',
    };

    rows.push({ identity, brandQuery: !manufacturer ? productName : undefined });
  }

  return rows;
}
