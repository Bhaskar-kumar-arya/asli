import { GetParameterCommand } from '@aws-sdk/client-ssm';
import type { SSMClient } from '@aws-sdk/client-ssm';

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * T02 Handoff: the Bedrock vision model id is read from SSM at Lambda
 * *runtime*, not baked in at synth/deploy time, so ops can swap the model id
 * (`aws ssm put-parameter`) without redeploying this stack. Cached 5 minutes
 * per warm Lambda instance to avoid a GetParameter call on every invoke.
 */
export function createModelIdLoader(ssmClient: SSMClient, paramName: string, now: () => number = Date.now): () => Promise<string> {
  let cache: { value: string; fetchedAt: number } | undefined;

  return async () => {
    if (cache && now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.value;
    }
    const result = await ssmClient.send(new GetParameterCommand({ Name: paramName }));
    const value = result.Parameter?.Value;
    if (!value) throw new Error(`SSM parameter ${paramName} has no value`);
    cache = { value, fetchedAt: now() };
    return value;
  };
}
