import { parseMonth } from '@asli/matching';
import type { MedicineIdentity, ScanWarning } from '@asli/contracts';
import type { BillExtraction, StripExtraction } from './extraction-schema';

const LOW_READ_CONFIDENCE_THRESHOLD = 0.7;

export interface ProcessedItem {
  identity: MedicineIdentity;
  /** Set when manufacturer is missing but a brand/product name is present - docs/SCANNING.md post-processing. */
  brandQuery?: string;
}

export interface ProcessedExtraction {
  items: ProcessedItem[];
  warnings: ScanWarning[];
}

function toFieldConfidence(confidence: {
  batchNumber?: number;
  manufacturer?: number;
  productName?: number;
  expDate?: number;
}): MedicineIdentity['fieldConfidence'] {
  const { batchNumber, manufacturer, productName, expDate } = confidence;
  return {
    ...(batchNumber !== undefined && { batchNumber }),
    ...(manufacturer !== undefined && { manufacturer }),
    ...(productName !== undefined && { productName }),
    ...(expDate !== undefined && { expMonth: expDate }),
  };
}

/** docs/SCANNING.md "Post-processing" for a single strip/carton extraction. */
export function processStripExtraction(extraction: StripExtraction | null): ProcessedExtraction {
  if (!extraction) {
    return { items: [], warnings: ['NO_BATCH_ON_LINE'] };
  }
  if (!extraction.isMedicinePack) {
    return { items: [], warnings: ['NOT_A_MEDICINE'] };
  }
  if (!extraction.batchNumber) {
    return { items: [], warnings: ['NO_BATCH_ON_LINE'] };
  }

  const mfgMonth = extraction.mfgDate ? (parseMonth(extraction.mfgDate) ?? undefined) : undefined;
  const expMonth = extraction.expDate ? (parseMonth(extraction.expDate) ?? undefined) : undefined;

  const identity: MedicineIdentity = {
    ...(extraction.productName && { productName: extraction.productName }),
    ...(extraction.brandName && { brandName: extraction.brandName }),
    batchNumber: extraction.batchNumber,
    ...(extraction.manufacturer && { manufacturer: extraction.manufacturer }),
    ...(mfgMonth && { mfgMonth }),
    ...(expMonth && { expMonth }),
    ...(extraction.strength && { strength: extraction.strength }),
    ...(extraction.dosageForm && { dosageForm: extraction.dosageForm }),
    ...(extraction.mrp && { mrp: extraction.mrp }),
    source: 'strip_vision',
    fieldConfidence: toFieldConfidence(extraction.confidence),
  };

  const brandQuery = !extraction.manufacturer ? (extraction.brandName ?? extraction.productName ?? undefined) : undefined;

  const warnings: ScanWarning[] = [];
  if ((extraction.confidence.batchNumber ?? 1) < LOW_READ_CONFIDENCE_THRESHOLD) warnings.push('LOW_READ_CONFIDENCE');

  return { items: [{ identity, brandQuery }], warnings };
}

/** docs/SCANNING.md "Post-processing" for a pharmacy bill's many lines. */
export function processBillExtraction(extraction: BillExtraction | null): ProcessedExtraction {
  if (!extraction || !extraction.isPharmacyBill) {
    return { items: [], warnings: extraction ? ['NOT_A_MEDICINE'] : ['NO_BATCH_ON_LINE'] };
  }

  const items: ProcessedItem[] = [];
  const warnings = new Set<ScanWarning>();

  for (const line of extraction.lines) {
    if (!line.batchNumber) {
      warnings.add('NO_BATCH_ON_LINE');
      continue;
    }

    const expMonth = line.expDate ? (parseMonth(line.expDate) ?? undefined) : undefined;

    const identity: MedicineIdentity = {
      ...(line.productName && { productName: line.productName }),
      batchNumber: line.batchNumber,
      ...(line.manufacturer && { manufacturer: line.manufacturer }),
      ...(expMonth && { expMonth }),
      ...(line.quantity !== null && line.quantity > 0 && { quantity: line.quantity }),
      ...(line.mrp && { mrp: line.mrp }),
      source: 'bill_vision',
      fieldConfidence: toFieldConfidence(line.confidence),
    };

    if ((line.confidence.batchNumber ?? 1) < LOW_READ_CONFIDENCE_THRESHOLD) warnings.add('LOW_READ_CONFIDENCE');

    const brandQuery = !line.manufacturer ? (line.productName ?? undefined) : undefined;
    items.push({ identity, brandQuery });
  }

  return { items, warnings: [...warnings] };
}
