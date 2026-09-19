import type { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { describe, expect, it, vi } from 'vitest';
import { createGeminiApiKeyLoader } from './gemini-api-key';

describe('createGeminiApiKeyLoader', () => {
  it('fetches and caches the secret value for 5 minutes', async () => {
    let calls = 0;
    const send = vi.fn(async () => {
      calls += 1;
      return { SecretString: 'test-key' };
    });
    const secretsClient = { send } as unknown as SecretsManagerClient;
    let time = 0;
    const load = createGeminiApiKeyLoader(secretsClient, 'asli/dev-c/gemini-api-key', () => time);

    expect(await load()).toBe('test-key');
    time += 4 * 60 * 1000;
    expect(await load()).toBe('test-key');
    expect(calls).toBe(1);

    time += 2 * 60 * 1000;
    await load();
    expect(calls).toBe(2);
  });

  it('throws when the secret has no string value', async () => {
    const send = vi.fn(async () => ({}));
    const secretsClient = { send } as unknown as SecretsManagerClient;
    const load = createGeminiApiKeyLoader(secretsClient, 'asli/dev-c/gemini-api-key');

    await expect(load()).rejects.toThrow(/no string value/);
  });
});
