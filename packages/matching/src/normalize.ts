import type { AliasMap } from './types';

/**
 * docs/MATCHING.md normalizeBatch.
 * The trailing separator after a label is required (not optional) so this stays
 * idempotent: a real batch number that happens to start with "LOT" or "BATCH"
 * followed immediately by digits (no separator) is left alone.
 */
const LABEL_RE = /^(?:BATCH\s*NO|B\.NO|B\s*NO|LOT\s*NO|BATCH|LOT)[:.\-\s]\s*/;

export function normalizeBatch(raw: string): string {
  let s = raw.normalize('NFKC').toUpperCase();
  s = s.replace(LABEL_RE, '');
  s = s.replace(/[-/._:#\s]/g, '');
  s = s.replace(/[^A-Z0-9]/g, '');
  return s;
}

/**
 * docs/MATCHING.md batchSkeleton.
 * Collapses characters commonly confused on foil/in OCR. T is intentionally left
 * unchanged (too lossy per the doc).
 */
const SKELETON_MAP: Record<string, string> = {
  O: '0',
  Q: '0',
  D: '0',
  I: '1',
  L: '1',
  J: '1',
  S: '5',
  B: '8',
  Z: '2',
  G: '6',
};

export function batchSkeleton(norm: string): string {
  let out = '';
  for (const c of norm) {
    out += SKELETON_MAP[c] ?? c;
  }
  return out;
}

const MFR_PREFIX_RE = /^M\/S\.?\s+|^MS\s+/;
const MFR_ADDRESS_SPLIT_RE = /,| AT | PLOT |\b\d{6}\b/;
const MFR_PUNCTUATION_RE = /[.,]/g;
const MFR_STOPWORDS = new Set(
  'PVT PRIVATE LTD LIMITED LLP INC CO COMPANY INDIA PHARMA PHARMACEUTICAL PHARMACEUTICALS PHARMACEUTICS LABS LAB LABORATORIES LABORATORY HEALTHCARE LIFESCIENCES LIFE SCIENCES REMEDIES DRUGS AND THE UNIT'.split(
    ' ',
  ),
);

/** docs/MATCHING.md normalizeManufacturer. */
export function normalizeManufacturer(raw: string, aliases?: AliasMap): string {
  let s = raw.normalize('NFKC').toUpperCase().replace(/&/g, 'AND');
  s = s.replace(MFR_PREFIX_RE, '');
  // Cut the address off before stripping punctuation, since the address split
  // relies on the comma that's still present at this point.
  s = (s.split(MFR_ADDRESS_SPLIT_RE)[0] ?? '').trim();
  s = s.replace(MFR_PUNCTUATION_RE, ' ');
  const tokens = s
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !MFR_STOPWORDS.has(t));
  const normalized = tokens.join(' ');
  return aliases?.[normalized] ?? normalized;
}

const MONTH_NAMES: Record<string, string> = {
  JAN: '01',
  JANUARY: '01',
  FEB: '02',
  FEBRUARY: '02',
  MAR: '03',
  MARCH: '03',
  APR: '04',
  APRIL: '04',
  MAY: '05',
  JUN: '06',
  JUNE: '06',
  JUL: '07',
  JULY: '07',
  AUG: '08',
  AUGUST: '08',
  SEP: '09',
  SEPT: '09',
  SEPTEMBER: '09',
  OCT: '10',
  OCTOBER: '10',
  NOV: '11',
  NOVEMBER: '11',
  DEC: '12',
  DECEMBER: '12',
};

/**
 * docs/DATA_SOURCES.md date formats: "YYYY-MM", "Mon-YYYY"/"MON-YYYY"/full month
 * names, "MM/YYYY", "DD/MM/YYYY". Returns null if unparseable.
 */
export function parseMonth(raw: string): string | null {
  const s = raw.trim().toUpperCase();

  const isoMatch = /^(\d{4})-(\d{2})$/.exec(s);
  if (isoMatch) {
    const [, year, month] = isoMatch;
    if (month! >= '01' && month! <= '12') return `${year}-${month}`;
    return null;
  }

  const monthNameMatch = /^([A-Z]+)[-\s](\d{4})$/.exec(s);
  if (monthNameMatch) {
    const [, name, year] = monthNameMatch;
    const month = MONTH_NAMES[name!];
    return month ? `${year}-${month}` : null;
  }

  const slashMatch = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (slashMatch) {
    const [, month, year] = slashMatch;
    const mm = month!.padStart(2, '0');
    if (mm >= '01' && mm <= '12') return `${year}-${mm}`;
    return null;
  }

  const dmySlashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (dmySlashMatch) {
    const [, , month, year] = dmySlashMatch;
    const mm = month!.padStart(2, '0');
    if (mm >= '01' && mm <= '12') return `${year}-${mm}`;
    return null;
  }

  return null;
}
