import { parseGs1 } from './gs1';
import { parseKeyValuePayload, parseUrlPayload } from './text';

export type QrPayloadFormat = 'gs1' | 'url' | 'keyvalue' | 'unknown';

export interface QrParseResult {
  /** true only when a batch number was extracted - the field matching needs. */
  recognized: boolean;
  format: QrPayloadFormat;
  batchNumber?: string;
  mfgMonth?: string;
  expMonth?: string;
  productName?: string;
  manufacturer?: string;
  /** GTIN from a GS1 payload (AI 01), not otherwise used by matching. */
  gtin?: string;
  /** The decoded QR text, unmodified - shown to the user when the format isn't recognized. */
  rawText: string;
}

/**
 * Parses a pack QR payload decoded in-browser (docs/SCANNING.md "Input
 * methods" §1). Payload styles vary by manufacturer - this tries GS1 element
 * strings first (the India pack QR mandate's format), then URLs with query
 * params, then plain key:value text. Anything else is left unrecognized so
 * the caller can fall back to a strip photo or manual entry.
 */
export function parseQrPayload(rawText: string): QrParseResult {
  const text = rawText.trim();

  const gs1 = parseGs1(text);
  if (gs1) {
    return { recognized: Boolean(gs1.batchNumber), format: 'gs1', ...gs1, rawText };
  }

  const url = parseUrlPayload(text);
  if (url) {
    return { recognized: Boolean(url.batchNumber), format: 'url', ...url, rawText };
  }

  const kv = parseKeyValuePayload(text);
  if (kv) {
    return { recognized: Boolean(kv.batchNumber), format: 'keyvalue', ...kv, rawText };
  }

  return { recognized: false, format: 'unknown', rawText };
}
