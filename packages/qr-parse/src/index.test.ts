import { describe, expect, it } from 'vitest';
import { parseQrPayload } from './index';

describe('parseQrPayload', () => {
  it('recognizes a GS1 bracket-form payload', () => {
    const result = parseQrPayload('(01)08904004401234(17)250630(10)ABC123');
    expect(result.recognized).toBe(true);
    expect(result.format).toBe('gs1');
    expect(result.batchNumber).toBe('ABC123');
    expect(result.expMonth).toBe('2025-06');
  });

  it('recognizes a URL payload', () => {
    const result = parseQrPayload('https://verify.example.com/m?b=ABC123&e=03/26');
    expect(result.recognized).toBe(true);
    expect(result.format).toBe('url');
    expect(result.batchNumber).toBe('ABC123');
  });

  it('recognizes a key:value payload', () => {
    const result = parseQrPayload('Batch: GTL1258\nExp: 08/2026');
    expect(result.recognized).toBe(true);
    expect(result.format).toBe('keyvalue');
    expect(result.batchNumber).toBe('GTL1258');
  });

  it('falls back to unrecognized with the raw text preserved', () => {
    const result = parseQrPayload('just some manufacturer-specific opaque code');
    expect(result.recognized).toBe(false);
    expect(result.format).toBe('unknown');
    expect(result.rawText).toBe('just some manufacturer-specific opaque code');
  });

  it('is unrecognized when a GS1/url/kv payload has no batch number', () => {
    const result = parseQrPayload('(01)08904004401234(17)250630');
    expect(result.recognized).toBe(false);
    expect(result.gtin).toBe('08904004401234');
  });
});
