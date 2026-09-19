import type { z } from 'zod';
import { recordGeminiTokens } from '../metrics';
import { BILL_PROMPT } from './prompts/bill';
import { STRIP_PROMPT } from './prompts/strip';
import {
  BILL_GEMINI_SCHEMA,
  BillExtractionSchema,
  STRIP_GEMINI_SCHEMA,
  StripExtractionSchema,
  type BillExtraction,
  type StripExtraction,
} from './extraction-schema';
import type { ImageExtractor } from './extractor';

const IMAGE_MIME_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
};

export interface GeminiExtractDeps {
  apiKey: string;
  modelId: string;
  fetchImpl?: typeof fetch;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/**
 * Gemini `generateContent` with `responseSchema` forcing structured JSON -
 * the same "extract, don't decide" role Bedrock's Converse tool call played
 * (CLAUDE.md rule 1). Validates with Zod; on invalid/unparseable output
 * retries once, then gives up (caller returns EXTRACTION_FAILED / prompts
 * manual entry), matching bedrock-client.ts's behaviour.
 */
async function callWithRetry<T>(
  deps: GeminiExtractDeps,
  purpose: 'strip' | 'bill',
  prompt: string,
  responseSchema: unknown,
  schema: z.ZodType<T>,
  imageBytes: Uint8Array,
  contentType: string,
): Promise<T | null> {
  const mimeType = IMAGE_MIME_BY_CONTENT_TYPE[contentType];
  if (!mimeType) return null;

  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${deps.modelId}:generateContent?key=${deps.apiKey}`;
  const body = {
    contents: [
      {
        parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: Buffer.from(imageBytes).toString('base64') } }],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema },
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) continue;

    const data = (await res.json()) as GeminiResponse;
    recordGeminiTokens(purpose, data.usageMetadata?.promptTokenCount ?? 0, data.usageMetadata?.candidatesTokenCount ?? 0);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) continue;
    try {
      const parsed = schema.safeParse(JSON.parse(text));
      if (parsed.success) return parsed.data;
    } catch {
      continue;
    }
  }
  return null;
}

export function extractStrip(
  deps: GeminiExtractDeps,
  imageBytes: Uint8Array,
  contentType: string,
): Promise<StripExtraction | null> {
  return callWithRetry(deps, 'strip', STRIP_PROMPT, STRIP_GEMINI_SCHEMA, StripExtractionSchema, imageBytes, contentType);
}

export function extractBill(
  deps: GeminiExtractDeps,
  imageBytes: Uint8Array,
  contentType: string,
): Promise<BillExtraction | null> {
  return callWithRetry(deps, 'bill', BILL_PROMPT, BILL_GEMINI_SCHEMA, BillExtractionSchema, imageBytes, contentType);
}

/** `ImageExtractor` adapter over the functions above - see extraction-provider.ts. */
export function createGeminiExtractor(deps: GeminiExtractDeps): ImageExtractor {
  return {
    extractStrip: (imageBytes, contentType) => extractStrip(deps, imageBytes, contentType),
    extractBill: (imageBytes, contentType) => extractBill(deps, imageBytes, contentType),
  };
}
