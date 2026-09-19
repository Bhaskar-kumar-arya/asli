import { describe, expect, it, vi } from 'vitest';
import { extractBill, extractStrip } from './gemini-client';

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

function geminiResponse(input: unknown, usage = { promptTokenCount: 1200, candidatesTokenCount: 40 }) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(input) }] } }],
      usageMetadata: usage,
    }),
  };
}

function fakeFetch(responses: unknown[]): typeof fetch {
  let call = 0;
  return vi.fn(async () => responses[Math.min(call++, responses.length - 1)]) as unknown as typeof fetch;
}

describe('extractStrip (Gemini)', () => {
  it('returns the validated extraction on a valid first response', async () => {
    const fetchImpl = fakeFetch([geminiResponse(validStripInput)]);
    const result = await extractStrip({ apiKey: 'k', modelId: 'gemini-3.5-flash-lite', fetchImpl }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toEqual(validStripInput);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries once on an invalid tool response, then succeeds', async () => {
    const fetchImpl = fakeFetch([geminiResponse({ isMedicinePack: 'not-a-bool' }), geminiResponse(validStripInput)]);
    const result = await extractStrip({ apiKey: 'k', modelId: 'gemini-3.5-flash-lite', fetchImpl }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toEqual(validStripInput);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('returns null after two invalid responses', async () => {
    const fetchImpl = fakeFetch([geminiResponse({}), geminiResponse({})]);
    const result = await extractStrip({ apiKey: 'k', modelId: 'gemini-3.5-flash-lite', fetchImpl }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('returns null without calling Gemini for an unsupported content type', async () => {
    const fetchImpl = fakeFetch([]);
    const result = await extractStrip({ apiKey: 'k', modelId: 'gemini-3.5-flash-lite', fetchImpl }, new Uint8Array([1]), 'application/pdf');

    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('retries on a non-OK HTTP response', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return calls === 1 ? { ok: false, json: async () => ({}) } : geminiResponse(validStripInput);
    }) as unknown as typeof fetch;
    const result = await extractStrip({ apiKey: 'k', modelId: 'gemini-3.5-flash-lite', fetchImpl }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toEqual(validStripInput);
    expect(calls).toBe(2);
  });

  it('retries once when the first attempt times out/aborts, then succeeds', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new DOMException('The operation was aborted.', 'AbortError');
      return geminiResponse(validStripInput);
    }) as unknown as typeof fetch;
    const result = await extractStrip({ apiKey: 'k', modelId: 'gemini-3.5-flash-lite', fetchImpl }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toEqual(validStripInput);
    expect(calls).toBe(2);
  });

  it('returns null when both attempts time out/abort', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }) as unknown as typeof fetch;
    const result = await extractStrip({ apiKey: 'k', modelId: 'gemini-3.5-flash-lite', fetchImpl }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('passes an abort signal with each request', async () => {
    const fetchImpl = fakeFetch([geminiResponse(validStripInput)]);
    await extractStrip({ apiKey: 'k', modelId: 'gemini-3.5-flash-lite', fetchImpl }, new Uint8Array([1]), 'image/jpeg');

    const [, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('extractBill (Gemini)', () => {
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
    const fetchImpl = fakeFetch([geminiResponse(billInput)]);
    const result = await extractBill({ apiKey: 'k', modelId: 'gemini-3.5-flash-lite', fetchImpl }, new Uint8Array([1]), 'image/jpeg');

    expect(result).toEqual(billInput);
  });
});
