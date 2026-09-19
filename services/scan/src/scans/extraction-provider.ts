import { GetParameterCommand } from '@aws-sdk/client-ssm';
import type { SSMClient } from '@aws-sdk/client-ssm';

const CACHE_TTL_MS = 5 * 60 * 1000;

export type ExtractionProvider = 'bedrock' | 'textract' | 'gemini';
const VALID_PROVIDERS: ExtractionProvider[] = ['bedrock', 'textract', 'gemini'];

function coerceProvider(value: string | undefined): ExtractionProvider {
  return VALID_PROVIDERS.includes(value as ExtractionProvider) ? (value as ExtractionProvider) : 'textract';
}

/**
 * Which backend `handler.ts` uses to pull fields off a strip/bill photo.
 * Bedrock model access is account-gated and may or may not clear during the
 * hackathon (submission/LEARNING_LOG.md) - "gemini" (gemini-client.ts, a
 * user-provided free-tier key in Secrets Manager) is the default vision
 * backend for now, "textract" (OCR + rules, no external AI call) is the
 * zero-dependency fallback, and "bedrock" is one `aws ssm put-parameter
 * --value bedrock` away the moment account access clears - no redeploy for
 * any of the three. Read from SSM at Lambda *runtime*, same pattern as
 * model-id.ts, cached 5 minutes per warm instance.
 */
export function createExtractionProviderLoader(
  ssmClient: SSMClient,
  paramName: string,
  now: () => number = Date.now,
): () => Promise<ExtractionProvider> {
  let cache: { value: ExtractionProvider; fetchedAt: number } | undefined;

  return async () => {
    if (cache && now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.value;
    }
    let raw: string | undefined;
    try {
      const result = await ssmClient.send(new GetParameterCommand({ Name: paramName }));
      raw = result.Parameter?.Value;
    } catch {
      raw = undefined;
    }
    const value = coerceProvider(raw);
    cache = { value, fetchedAt: now() };
    return value;
  };
}
