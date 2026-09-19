import type { BillExtraction, StripExtraction } from './extraction-schema';

/**
 * Both extraction backends (Bedrock vision, Textract OCR + rules) implement this
 * so `handler.ts` can switch between them at runtime without touching
 * post-process.ts or the response shape. See extraction-provider.ts for how the
 * choice is made.
 */
export interface ImageExtractor {
  extractStrip(imageBytes: Uint8Array, contentType: string): Promise<StripExtraction | null>;
  extractBill(imageBytes: Uint8Array, contentType: string): Promise<BillExtraction | null>;
}
