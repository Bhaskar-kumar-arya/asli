import type { SSMClient } from '@aws-sdk/client-ssm';
import { describe, expect, it, vi } from 'vitest';
import { createModelIdLoader } from './model-id';

describe('createModelIdLoader', () => {
  it('fetches and caches the parameter value for 5 minutes', async () => {
    let calls = 0;
    const send = vi.fn(async () => {
      calls += 1;
      return { Parameter: { Value: 'anthropic.claude-3-model' } };
    });
    const ssmClient = { send } as unknown as SSMClient;
    let time = 0;
    const load = createModelIdLoader(ssmClient, '/asli/dev-c/bedrock/visionModelId', () => time);

    expect(await load()).toBe('anthropic.claude-3-model');
    time += 4 * 60 * 1000;
    expect(await load()).toBe('anthropic.claude-3-model');
    expect(calls).toBe(1);

    time += 2 * 60 * 1000;
    await load();
    expect(calls).toBe(2);
  });

  it('throws when the parameter has no value', async () => {
    const send = vi.fn(async () => ({ Parameter: {} }));
    const ssmClient = { send } as unknown as SSMClient;
    const load = createModelIdLoader(ssmClient, '/asli/dev-c/bedrock/visionModelId');

    await expect(load()).rejects.toThrow(/no value/);
  });
});
