import type { StripExtraction } from '../extraction-schema';

const BATCH_LABEL = /(?:^|[^a-z])(?:b\.?\s*no\.?|batch\s*no\.?|batch|lot\s*no\.?|lot)\s*[:-]?\s*([A-Za-z0-9][A-Za-z0-9/-]{2,15})/i;
const MFR_LABEL = /(?:mfd\.?\s*by|manufactured\s*by)\s*[:\-.]?\s*(.+)/i;
const MARKETER_LABEL = /marketed\s*by\s*[:\-.]?\s*(.+)/i;
const MFG_DATE_LABEL = /(?:mfg\.?\s*date|mfd\.?\s*date|manufactured\s*(?:on|date)|mfg\.?|mfd\.?)/i;
const EXP_DATE_LABEL = /(?:exp\.?\s*date|exp\.?|expiry|use\s*before|best\s*before)/i;
const LICENCE_LINE = /\b(?:lic|licence|license)\b/i;
const DATE_TOKEN = /\b(\d{1,2}[/.-]\d{2,4}|\d{4}[/.-]\d{1,2}|[A-Za-z]{3,9}[\s-]\d{2,4})\b/;
const MRP_LABEL = /\bm\.?\s*r\.?\s*p\.?\b[^0-9]{0,10}(?:rs\.?|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i;
const STRENGTH_TOKEN = /\b(\d+(?:\.\d+)?\s?(?:mg|mcg|ml|g|iu|%))\b/i;
const DOSAGE_FORMS = [
  'tablets', 'tablet', 'capsules', 'capsule', 'syrup', 'suspension', 'injection', 'injectable',
  'ointment', 'cream', 'gel', 'drops', 'lotion', 'powder', 'spray', 'sachet',
];

function clean(text: string): string {
  return text.trim().replace(/[.,]+$/, '');
}

/**
 * Rules-based fallback for docs/SCANNING.md's strip extraction schema, used
 * when EXTRACTION_PROVIDER is "textract" instead of "bedrock" (see
 * ../extraction-provider.ts). Runs over Textract's plain OCR lines - no
 * vision model, so confidence is deliberately capped lower than a Bedrock
 * read would report, which correctly routes low-confidence results through
 * the editable confirmation step (docs/SCANNING.md "UI after scan").
 */
export function parseStripLines(lines: string[]): StripExtraction {
  const consumed = new Set<number>();
  let batchNumber: string | null = null;
  let batchConfidence: number | undefined;
  let manufacturer: string | null = null;
  let notes: string | null = null;
  let mfgDate: string | null = null;
  let expDate: string | null = null;
  let mrp: string | null = null;

  for (const [i, line] of lines.entries()) {
    if (LICENCE_LINE.test(line)) continue;

    if (!batchNumber) {
      const m = BATCH_LABEL.exec(line);
      if (m?.[1]) {
        batchNumber = m[1];
        batchConfidence = 0.85;
        consumed.add(i);
        continue;
      }
    }
    if (!manufacturer) {
      const m = MFR_LABEL.exec(line);
      if (m?.[1]) {
        manufacturer = clean(m[1]);
        consumed.add(i);
        continue;
      }
    }
    const mrpMatch = MRP_LABEL.exec(line);
    if (mrpMatch?.[1]) {
      mrp = mrpMatch[1];
      consumed.add(i);
    }
  }

  if (!manufacturer) {
    for (const [i, line] of lines.entries()) {
      const m = MARKETER_LABEL.exec(line);
      if (m?.[1]) {
        notes = `Marketed by ${clean(m[1])}`;
        consumed.add(i);
        break;
      }
    }
  }

  for (const [i, line] of lines.entries()) {
    if (consumed.has(i)) continue;
    const dateToken = DATE_TOKEN.exec(line);
    if (!dateToken?.[1]) continue;
    if (EXP_DATE_LABEL.test(line) && !expDate) {
      expDate = dateToken[1];
      consumed.add(i);
    } else if (MFG_DATE_LABEL.test(line) && !LICENCE_LINE.test(line) && !mfgDate) {
      mfgDate = dateToken[1];
      consumed.add(i);
    }
  }
  // A second, unlabelled date is usually the expiry (labels get OCR'd away or misread).
  if (!expDate) {
    for (const [i, line] of lines.entries()) {
      if (consumed.has(i)) continue;
      const dateToken = DATE_TOKEN.exec(line);
      if (dateToken?.[1]) {
        expDate = dateToken[1];
        consumed.add(i);
        break;
      }
    }
  }

  let strength: string | null = null;
  for (const line of lines) {
    const m = STRENGTH_TOKEN.exec(line);
    if (m?.[1]) {
      strength = m[1].replace(/\s+/, '');
      break;
    }
  }

  let dosageForm: string | null = null;
  outer: for (const line of lines) {
    const words = line.toLowerCase().split(/[^a-z]+/);
    for (const form of DOSAGE_FORMS) {
      if (words.includes(form)) {
        dosageForm = form.charAt(0).toUpperCase() + form.slice(1);
        break outer;
      }
    }
  }

  let productName: string | null = null;
  for (const [i, line] of lines.entries()) {
    if (consumed.has(i)) continue;
    if (LICENCE_LINE.test(line)) continue;
    const trimmed = line.trim();
    if (trimmed.length >= 3 && /[a-zA-Z]{3,}/.test(trimmed)) {
      productName = trimmed;
      break;
    }
  }

  const isMedicinePack = Boolean(batchNumber || dosageForm || strength || expDate);

  const confidence: StripExtraction['confidence'] = {
    ...(batchConfidence !== undefined && { batchNumber: batchConfidence }),
    ...(manufacturer && { manufacturer: 0.75 }),
    ...(productName && { productName: 0.5 }),
    ...(expDate && { expDate: 0.6 }),
  };

  return {
    isMedicinePack,
    productName: isMedicinePack ? productName : null,
    brandName: null,
    batchNumber,
    manufacturer,
    mfgDate,
    expDate,
    strength,
    dosageForm,
    mrp,
    confidence,
    notes,
  };
}
