/**
 * GS1 element string parsing (docs/SCANNING.md "Input methods" §1). Only the
 * application identifiers Asli cares about are decoded: 01 (GTIN, fixed 14),
 * 10 (batch/lot, variable), 11 (production date, fixed YYMMDD), 17 (expiry
 * date, fixed YYMMDD). Any other AI is skipped but does not abort parsing.
 */

const FIXED_LENGTH_AIS: Record<string, number> = {
  '00': 18,
  '01': 14,
  '11': 6,
  '13': 6,
  '15': 6,
  '17': 6,
};

/** Group separator used to terminate variable-length fields in raw (FNC1) GS1 strings. */
const GS = '';

export interface Gs1Fields {
  gtin?: string;
  batchNumber?: string;
  mfgMonth?: string;
  expMonth?: string;
}

/**
 * GS1 dates are YYMMDD with no century. Pharma QR codes are never from
 * before 2000, so YY is always taken as 20YY. DD is ignored (matching only
 * tracks month) - "00" (meaning "unspecified day") is common and fine to drop.
 */
function yymmddToYyyyMm(digits: string): string | undefined {
  if (!/^\d{6}$/.test(digits)) return undefined;
  const yy = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  if (mm < '01' || mm > '12') return undefined;
  return `20${yy}-${mm}`;
}

/** Human-readable bracket form, e.g. "(01)08904004401234(17)250630(10)ABC123". */
function parseBracketForm(text: string): Map<string, string> | undefined {
  const re = /\((\d{2,4})\)([^(]*)/g;
  const fields = new Map<string, string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    fields.set(match[1]!, match[2]!.trim());
  }
  return fields.size > 0 ? fields : undefined;
}

/** Raw FNC1-delimited form: concatenated "<AI><value>" pairs, GS separates variable fields. */
function parseRawForm(text: string): Map<string, string> | undefined {
  const fields = new Map<string, string>();
  let i = 0;
  // Some scanners prefix the raw string with a symbology identifier like "]d2",
  // and/or a leading GS - strip both before parsing AI pairs.
  let s = text.replace(/^]d2/i, '');
  if (s.startsWith(GS)) s = s.slice(1);
  while (i < s.length) {
    const ai = s.slice(i, i + 2);
    if (!/^\d{2}$/.test(ai)) break;
    i += 2;
    const fixedLen = FIXED_LENGTH_AIS[ai];
    if (fixedLen) {
      const value = s.slice(i, i + fixedLen);
      if (value.length < fixedLen) break;
      fields.set(ai, value);
      i += fixedLen;
    } else {
      const gsIndex = s.indexOf(GS, i);
      const end = gsIndex === -1 ? s.length : gsIndex;
      fields.set(ai, s.slice(i, end));
      i = gsIndex === -1 ? s.length : gsIndex + 1;
    }
  }
  return fields.size > 0 ? fields : undefined;
}

export function parseGs1(text: string): Gs1Fields | undefined {
  const fields = parseBracketForm(text) ?? parseRawForm(text);
  if (!fields) return undefined;

  const result: Gs1Fields = {};
  const gtin = fields.get('01');
  const batch = fields.get('10');
  const mfg = fields.get('11');
  const exp = fields.get('17');
  if (gtin) result.gtin = gtin;
  if (batch) result.batchNumber = batch;
  if (mfg) result.mfgMonth = yymmddToYyyyMm(mfg);
  if (exp) result.expMonth = yymmddToYyyyMm(exp);

  return Object.keys(result).length > 0 ? result : undefined;
}
