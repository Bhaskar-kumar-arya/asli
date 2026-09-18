import { describe, expect, it, vi } from 'vitest';
import type { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createBedrockReasonClassifier } from './reason-classifier-bedrock';

function fakeMetrics(): { addDimension: ReturnType<typeof vi.fn>; addMetric: ReturnType<typeof vi.fn> } {
  return { addDimension: vi.fn(), addMetric: vi.fn() };
}

describe('createBedrockReasonClassifier', () => {
  it('returns the cached ReasonCode from Reference without calling Bedrock', async () => {
    const docSend = vi.fn().mockResolvedValue({ Item: { reasonCode: 'ASSAY' } });
    const bedrockSend = vi.fn();
    const metrics = fakeMetrics();

    const classify = createBedrockReasonClassifier({
      bedrock: { send: bedrockSend } as unknown as BedrockRuntimeClient,
      doc: { send: docSend } as unknown as DynamoDBDocumentClient,
      referenceTableName: 'asli-dev-a2-reference',
      modelId: 'anthropic.claude-3-haiku',
      metrics: metrics as never,
    });

    const result = await classify('Some new phrasing of an assay failure');

    expect(result).toBe('ASSAY');
    expect(bedrockSend).not.toHaveBeenCalled();
  });

  it('calls Bedrock on a cache miss, constrains the reply to the enum, and caches the result', async () => {
    const docSend = vi.fn().mockResolvedValueOnce({ Item: undefined }).mockResolvedValueOnce({});
    const bedrockSend = vi.fn().mockResolvedValue({
      output: { message: { content: [{ text: 'STERILITY' }] } },
      usage: { inputTokens: 42, outputTokens: 3 },
    });
    const metrics = fakeMetrics();

    const classify = createBedrockReasonClassifier({
      bedrock: { send: bedrockSend } as unknown as BedrockRuntimeClient,
      doc: { send: docSend } as unknown as DynamoDBDocumentClient,
      referenceTableName: 'asli-dev-a2-reference',
      modelId: 'anthropic.claude-3-haiku',
      metrics: metrics as never,
    });

    const result = await classify('a totally novel failure description');

    expect(result).toBe('STERILITY');
    expect(bedrockSend).toHaveBeenCalledTimes(1);
    expect(docSend).toHaveBeenCalledTimes(2); // Get (miss) then Put (cache)
    const putCommand = docSend.mock.calls[1]![0] as { input: { Item: { reasonCode: string } } };
    expect(putCommand.input.Item.reasonCode).toBe('STERILITY');
    expect(metrics.addMetric).toHaveBeenCalledWith('BedrockInputTokens', expect.anything(), 42);
    expect(metrics.addMetric).toHaveBeenCalledWith('BedrockOutputTokens', expect.anything(), 3);
  });

  it('falls back to OTHER without caching when Bedrock itself is unavailable (e.g. model access blocked)', async () => {
    const docSend = vi.fn().mockResolvedValueOnce({ Item: undefined });
    const bedrockSend = vi.fn().mockRejectedValue(Object.assign(new Error('blocked'), { name: 'ValidationException' }));

    const classify = createBedrockReasonClassifier({
      bedrock: { send: bedrockSend } as unknown as BedrockRuntimeClient,
      doc: { send: docSend } as unknown as DynamoDBDocumentClient,
      referenceTableName: 'asli-dev-a2-reference',
      modelId: 'PLACEHOLDER_PENDING_T01',
    });

    const result = await classify('an outage should not fail the whole month');
    expect(result).toBe('OTHER');
    expect(docSend).toHaveBeenCalledTimes(1); // only the cache Get, no Put - never cache an outage
  });

  it('falls back to OTHER when Bedrock replies with something outside the enum', async () => {
    const docSend = vi.fn().mockResolvedValueOnce({ Item: undefined }).mockResolvedValueOnce({});
    const bedrockSend = vi.fn().mockResolvedValue({
      output: { message: { content: [{ text: 'NOT_A_REAL_CODE' }] } },
    });

    const classify = createBedrockReasonClassifier({
      bedrock: { send: bedrockSend } as unknown as BedrockRuntimeClient,
      doc: { send: docSend } as unknown as DynamoDBDocumentClient,
      referenceTableName: 'asli-dev-a2-reference',
      modelId: 'anthropic.claude-3-haiku',
    });

    const result = await classify('something Bedrock cannot classify');
    expect(result).toBe('OTHER');
  });
});
