import { describe, expect, it } from 'vitest';
import { parseGs1 } from './gs1';

describe('parseGs1', () => {
  it('parses bracket form with GTIN, expiry and batch', () => {
    const fields = parseGs1('(01)08904004401234(17)250630(10)ABC123');
    expect(fields).toEqual({
      gtin: '08904004401234',
      expMonth: '2025-06',
      batchNumber: 'ABC123',
    });
  });

  it('parses bracket form with production date too', () => {
    const fields = parseGs1('(01)08904004401234(11)230101(17)250630(10)GTL1258');
    expect(fields).toEqual({
      gtin: '08904004401234',
      mfgMonth: '2023-01',
      expMonth: '2025-06',
      batchNumber: 'GTL1258',
    });
  });

  it('parses raw FNC1-delimited form with a GS-terminated variable batch', () => {
    const raw = `01089040044012341725063010ABC12311230101`;
    const fields = parseGs1(raw);
    expect(fields).toEqual({
      gtin: '08904004401234',
      expMonth: '2025-06',
      batchNumber: 'ABC123',
      mfgMonth: '2023-01',
    });
  });

  it('parses a raw form where the variable batch runs to end of string', () => {
    const raw = '0108904004401234' + '17250630' + '10RPL-1013';
    const fields = parseGs1(raw);
    expect(fields?.batchNumber).toBe('RPL-1013');
    expect(fields?.expMonth).toBe('2025-06');
  });

  it('returns undefined for non-GS1 text', () => {
    expect(parseGs1('hello world')).toBeUndefined();
  });

  it('drops an invalid month rather than throwing', () => {
    const fields = parseGs1('(17)259930(10)ABC123');
    expect(fields).toEqual({ batchNumber: 'ABC123' });
  });
});
