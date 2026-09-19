import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import type { DocumentType } from '@smithy/types';
import type { z } from 'zod';
import { recordBedrockTokens } from '../metrics';
import { BILL_PROMPT } from './prompts/bill';
import { STRIP_PROMPT } from './prompts/strip';
import {
  BILL_TOOL_JSON_SCHEMA,
  BillExtractionSchema,
  STRIP_TOOL_JSON_SCHEMA,
  StripExtractionSchema,
  type BillExtraction,
  type StripExtraction,
} from './extraction-schema';
import type { ImageExtractor } from './extractor';

const TOOL_NAME = 'record_medicines';
const IMAGE_FORMAT_BY_CONTENT_TYPE: Record<string, 'jpeg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface BedrockExtractDeps {
  bedrockClient: BedrockRuntimeClient;
  modelId: string;
}

/**
 * docs/SCANNING.md "Bedrock call": Converse API, temperature 0, a single forced
 * tool whose input schema is the extraction schema. Validates with Zod; on
 * invalid tool output retries once with the same request, then gives up
 * (caller returns EXTRACTION_FAILED / prompts manual entry).
 */
async function callWithRetry<T>(
  deps: BedrockExtractDeps,
  purpose: 'strip' | 'bill',
  prompt: string,
  toolInputSchema: DocumentType,
  schema: z.ZodType<T>,
  imageBytes: Uint8Array,
  contentType: string,
): Promise<T | null> {
  const format = IMAGE_FORMAT_BY_CONTENT_TYPE[contentType];
  if (!format) return null;

  const command = new ConverseCommand({
    modelId: deps.modelId,
    system: [{ text: prompt }],
    messages: [
      {
        role: 'user',
        content: [{ image: { format, source: { bytes: imageBytes } } }],
      },
    ],
    inferenceConfig: { temperature: 0 },
    toolConfig: {
      tools: [{ toolSpec: { name: TOOL_NAME, inputSchema: { json: toolInputSchema } } }],
      toolChoice: { tool: { name: TOOL_NAME } },
    },
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await deps.bedrockClient.send(command);
    recordBedrockTokens(purpose, response.usage?.inputTokens ?? 0, response.usage?.outputTokens ?? 0);

    const toolUse = response.output?.message?.content?.find((block) => 'toolUse' in block)?.toolUse;
    const parsed = toolUse ? schema.safeParse(toolUse.input) : undefined;
    if (parsed?.success) return parsed.data;
  }
  return null;
}

export function extractStrip(
  deps: BedrockExtractDeps,
  imageBytes: Uint8Array,
  contentType: string,
): Promise<StripExtraction | null> {
  return callWithRetry(deps, 'strip', STRIP_PROMPT, STRIP_TOOL_JSON_SCHEMA, StripExtractionSchema, imageBytes, contentType);
}

export function extractBill(
  deps: BedrockExtractDeps,
  imageBytes: Uint8Array,
  contentType: string,
): Promise<BillExtraction | null> {
  return callWithRetry(deps, 'bill', BILL_PROMPT, BILL_TOOL_JSON_SCHEMA, BillExtractionSchema, imageBytes, contentType);
}

/** `ImageExtractor` adapter over the functions above - see extraction-provider.ts. */
export function createBedrockExtractor(deps: BedrockExtractDeps): ImageExtractor {
  return {
    extractStrip: (imageBytes, contentType) => extractStrip(deps, imageBytes, contentType),
    extractBill: (imageBytes, contentType) => extractBill(deps, imageBytes, contentType),
  };
}
