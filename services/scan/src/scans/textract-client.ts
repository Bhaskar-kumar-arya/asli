import { AnalyzeDocumentCommand, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import type { TextractClient } from '@aws-sdk/client-textract';
import { recordTextractPage } from '../metrics';
import { firstTableToGrid, linesFromBlocks } from './textract/blocks';
import { parseBillFromLines, parseBillFromTable } from './textract/parse-bill';
import { parseStripLines } from './textract/parse-strip';
import type { BillExtraction, StripExtraction } from './extraction-schema';
import type { ImageExtractor } from './extractor';

const SUPPORTED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png']);

export interface TextractExtractDeps {
  textractClient: TextractClient;
}

async function extractStripViaTextract(
  deps: TextractExtractDeps,
  imageBytes: Uint8Array,
  contentType: string,
): Promise<StripExtraction | null> {
  if (!SUPPORTED_CONTENT_TYPES.has(contentType)) return null;

  const response = await deps.textractClient.send(
    new DetectDocumentTextCommand({ Document: { Bytes: imageBytes } }),
  );
  recordTextractPage('strip');
  const lines = linesFromBlocks(response.Blocks ?? []);
  if (lines.length === 0) return null;

  return parseStripLines(lines);
}

async function extractBillViaTextract(
  deps: TextractExtractDeps,
  imageBytes: Uint8Array,
  contentType: string,
): Promise<BillExtraction | null> {
  if (!SUPPORTED_CONTENT_TYPES.has(contentType)) return null;

  const response = await deps.textractClient.send(
    new AnalyzeDocumentCommand({ Document: { Bytes: imageBytes }, FeatureTypes: ['TABLES'] }),
  );
  recordTextractPage('bill');
  const blocks = response.Blocks ?? [];

  const grid = firstTableToGrid(blocks);
  const fromTable = parseBillFromTable(grid);
  if (fromTable) return fromTable;

  const lines = linesFromBlocks(blocks);
  if (lines.length === 0) return null;
  return parseBillFromLines(lines);
}

/** `ImageExtractor` backed by Textract OCR + rules-based parsing - see extraction-provider.ts. */
export function createTextractExtractor(deps: TextractExtractDeps): ImageExtractor {
  return {
    extractStrip: (imageBytes, contentType) => extractStripViaTextract(deps, imageBytes, contentType),
    extractBill: (imageBytes, contentType) => extractBillViaTextract(deps, imageBytes, contentType),
  };
}
