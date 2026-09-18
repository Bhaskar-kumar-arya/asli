import { parseMonth } from '@asli/matching';

/**
 * @asli/matching's parseMonth covers "YYYY-MM", "Mon-YYYY", "MM/YYYY",
 * "DD/MM/YYYY". QR payloads (URL params, key:value text) also commonly use a
 * 2-digit year ("03/26"), which this adds on top.
 */
export function parseMonthLoose(raw: string): string | undefined {
  const viaMatching = parseMonth(raw);
  if (viaMatching) return viaMatching;

  const s = raw.trim();
  const mmYy = /^(\d{1,2})\/(\d{2})$/.exec(s);
  if (mmYy) {
    const mm = mmYy[1]!.padStart(2, '0');
    const yy = Number(mmYy[2]);
    if (mm >= '01' && mm <= '12') return `20${String(yy).padStart(2, '0')}-${mm}`;
  }
  return undefined;
}

export interface TextFields {
  batchNumber?: string;
  mfgMonth?: string;
  expMonth?: string;
  productName?: string;
  manufacturer?: string;
}

const KEY_ALIASES: Record<keyof TextFields, string[]> = {
  batchNumber: ['batch', 'batchno', 'batch no', 'b.no', 'bno', 'lot', 'lotno', 'lot no', 'b'],
  mfgMonth: ['mfg', 'mfgdate', 'mfg date', 'mfd', 'manufactured', 'm'],
  expMonth: ['exp', 'expiry', 'expdate', 'exp date', 'expiration', 'e'],
  productName: ['product', 'productname', 'name', 'pname', 'p', 'medicine'],
  manufacturer: ['mfr', 'manufacturer', 'brand', 'company'],
};

function pick(map: Map<string, string>, field: keyof TextFields): string | undefined {
  for (const key of KEY_ALIASES[field]) {
    const value = map.get(key);
    if (value) return value;
  }
  return undefined;
}

/** URLs with query params, e.g. "https://verify.example.com/m?b=ABC123&e=03/26". */
export function parseUrlPayload(text: string): TextFields | undefined {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return undefined;
  }

  const params = new Map<string, string>();
  for (const [key, value] of url.searchParams.entries()) {
    if (value) params.set(key.toLowerCase(), value);
  }
  if (params.size === 0) return undefined;

  const batchNumber = pick(params, 'batchNumber');
  const mfgRaw = pick(params, 'mfgMonth');
  const expRaw = pick(params, 'expMonth');
  const productName = pick(params, 'productName');
  const manufacturer = pick(params, 'manufacturer');

  if (!batchNumber && !mfgRaw && !expRaw && !productName && !manufacturer) return undefined;

  const fields: TextFields = {};
  if (batchNumber) fields.batchNumber = batchNumber;
  if (mfgRaw) fields.mfgMonth = parseMonthLoose(mfgRaw);
  if (expRaw) fields.expMonth = parseMonthLoose(expRaw);
  if (productName) fields.productName = productName;
  if (manufacturer) fields.manufacturer = manufacturer;
  return fields;
}

/** Plain "key: value" or "key=value" text, one pair per line or separated by ; or ,. */
export function parseKeyValuePayload(text: string): TextFields | undefined {
  const lines = text
    .split(/[\n;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const map = new Map<string, string>();
  for (const line of lines) {
    const match = /^([A-Za-z][A-Za-z .]*?)\s*[:=]\s*(.+)$/.exec(line);
    if (!match) continue;
    const key = match[1]!.trim().toLowerCase();
    const value = match[2]!.trim();
    if (value) map.set(key, value);
  }
  if (map.size === 0) return undefined;

  const batchNumber = pick(map, 'batchNumber');
  const mfgRaw = pick(map, 'mfgMonth');
  const expRaw = pick(map, 'expMonth');
  const productName = pick(map, 'productName');
  const manufacturer = pick(map, 'manufacturer');

  if (!batchNumber && !mfgRaw && !expRaw && !productName && !manufacturer) return undefined;

  const fields: TextFields = {};
  if (batchNumber) fields.batchNumber = batchNumber;
  if (mfgRaw) fields.mfgMonth = parseMonthLoose(mfgRaw);
  if (expRaw) fields.expMonth = parseMonthLoose(expRaw);
  if (productName) fields.productName = productName;
  if (manufacturer) fields.manufacturer = manufacturer;
  return fields;
}
