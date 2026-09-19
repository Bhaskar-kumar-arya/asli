import type { SSMClient } from '@aws-sdk/client-ssm';
import { describe, expect, it, vi } from 'vitest';
import { createExtractionProviderLoader } from './extraction-provider';

function fakeSsm(value: string | undefined): SSMClient {
  const send = vi.fn(async () => ({ Parameter: value === undefined ? undefined : { Value: value } }));
  return { send } as unknown as SSMClient;
}

describe('createExtractionProviderLoader', () => {
  it('returns "bedrock" when the param is set to bedrock', async () => {
    const load = createExtractionProviderLoader(fakeSsm('bedrock'), '/param');
    expect(await load()).toBe('bedrock');
  });

  it('returns "gemini" when the param is set to gemini', async () => {
    const load = createExtractionProviderLoader(fakeSsm('gemini'), '/param');
    expect(await load()).toBe('gemini');
  });

  it('returns "textract" when the param is set to textract', async () => {
    const load = createExtractionProviderLoader(fakeSsm('textract'), '/param');
    expect(await load()).toBe('textract');
  });

  it('defaults to "textract" for an unrecognized value', async () => {
    const load = createExtractionProviderLoader(fakeSsm('something-else'), '/param');
    expect(await load()).toBe('textract');
  });

  it('defaults to "textract" when the param has no value', async () => {
    const load = createExtractionProviderLoader(fakeSsm(undefined), '/param');
    expect(await load()).toBe('textract');
  });

  it('defaults to "textract" when SSM throws, so a missing param never breaks scanning', async () => {
    const ssm = { send: vi.fn(async () => { throw new Error('AccessDenied'); }) } as unknown as SSMClient;
    const load = createExtractionProviderLoader(ssm, '/param');
    expect(await load()).toBe('textract');
  });

  it('caches for the TTL then refetches', async () => {
    let now = 0;
    const ssm = fakeSsm('bedrock');
    const load = createExtractionProviderLoader(ssm, '/param', () => now);

    await load();
    now += 60_000;
    await load();
    expect(ssm.send).toHaveBeenCalledTimes(1);

    now += 5 * 60 * 1000 + 1;
    await load();
    expect(ssm.send).toHaveBeenCalledTimes(2);
  });
});
