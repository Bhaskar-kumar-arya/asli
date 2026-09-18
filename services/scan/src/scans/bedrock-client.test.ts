import type { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { describe, expect, it, vi } from 'vitest';
import { extractBill, extractStrip } from './bedrock-client';

const validStripInput = {
  isMedicinePack: true,
  productName: 'Amoxicillin 500mg Capsules',
  brandName: null,
  batchNumber: 'GTL 1258',
  manufacturer: 'Gidsha Pharmaceuticals',
  mfgDate: null,
  expDate: '2026-10',
  strength: '500mg',
  dosageForm: 'Capsules',
  mrp: null,
  confidence: { batchNumber: 0.95, manufacturer: 0.9, productName: 0.9, expDate: 0.9 },
  notes: null,
};

function toolResponse(input: unknown, usage = { inputTokens: 10, outputTokens: 5 }) {
  return {
    output: { message: { content: [{ toolUse: { name: 'record_medicines', input } }] } },
    usage,
  };
}

function fakeClient(responses: unknown[]): BedrockRuntimeClient {
  let call = 0;
  const send = vi.fn(async () => responses[Math.min(call++, responses.length - 1)]);
  return { send } as unknown as BedrockRuntimeClient;
}

describe('extractStrip', () => {
  it('returns the validated extraction on a valid first response', async () => {
    const bedrockClient = fakeClient([toolResponse(validStripInput)]);
    const result = await extractStrip({ bedrockClient, modelId: 'model-1' }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toEqual(validStripInput);
    expect(bedrockClient.send).toHaveBeenCalledTimes(1);
  });

  it('retries once on an invalid tool response, then succeeds', async () => {
    const bedrockClient = fakeClient([toolResponse({ isMedicinePack: 'not-a-bool' }), toolResponse(validStripInput)]);
    const result = await extractStrip({ bedrockClient, modelId: 'model-1' }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toEqual(validStripInput);
    expect(bedrockClient.send).toHaveBeenCalledTimes(2);
  });

  it('returns null after two invalid responses', async () => {
    const bedrockClient = fakeClient([toolResponse({}), toolResponse({})]);
    const result = await extractStrip({ bedrockClient, modelId: 'model-1' }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toBeNull();
    expect(bedrockClient.send).toHaveBeenCalledTimes(2);
  });

  it('returns null without calling Bedrock for an unsupported content type', async () => {
    const bedrockClient = fakeClient([]);
    const result = await extractStrip({ bedrockClient, modelId: 'model-1' }, new Uint8Array([1]), 'application/pdf');

    expect(result).toBeNull();
    expect(bedrockClient.send).not.toHaveBeenCalled();
  });
});

describe('extractBill', () => {
  it('returns the validated bill extraction', async () => {
    const billInput = {
      isPharmacyBill: true,
      lines: [
        {
          productName: 'Amoxicillin 500mg Capsules',
          batchNumber: 'GTL1258',
          expDate: null,
          manufacturer: null,
          quantity: 10,
          mrp: null,
          confidence: { batchNumber: 0.9 },
        },
      ],
    };
    const bedrockClient = fakeClient([toolResponse(billInput)]);
    const result = await extractBill({ bedrockClient, modelId: 'model-1' }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toEqual(billInput);
  });
});
