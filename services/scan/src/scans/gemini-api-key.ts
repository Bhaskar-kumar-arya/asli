import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Gemini API key from Secrets Manager (CLAUDE.md "no secrets in code"),
 * read at Lambda runtime and cached 5 minutes per warm instance - same
 * pattern as model-id.ts. This is a temporary, user-provided free-tier key
 * (see submission/LEARNING_LOG.md); rotate the secret value with
 * `aws secretsmanager put-secret-value`, no redeploy needed.
 */
export function createGeminiApiKeyLoader(
  secretsClient: SecretsManagerClient,
  secretId: string,
  now: () => number = Date.now,
): () => Promise<string> {
  let cache: { value: string; fetchedAt: number } | undefined;

  return async () => {
    if (cache && now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.value;
    }
    const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
    const value = result.SecretString;
    if (!value) throw new Error(`Secret ${secretId} has no string value`);
    cache = { value, fetchedAt: now() };
    return value;
  };
}
