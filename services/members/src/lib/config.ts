import { GetParameterCommand } from '@aws-sdk/client-ssm';
import type { SSMClient } from '@aws-sdk/client-ssm';

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * docs/PERMISSIONS.md "SSM switch /asli/<stage>/authz/mode = stub|avp". Read at
 * Lambda *runtime* (like C's Bedrock model id, see services/scan/src/scans/model-id.ts)
 * so ops can flip modes without redeploying, e.g. once AVP's account
 * restriction (plan/tasks/T01-spikes.md Handoff) clears. Cached 5 minutes per
 * warm instance.
 */
export function createSsmParamLoader(ssmClient: SSMClient, paramName: string, now: () => number = Date.now): () => Promise<string> {
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
