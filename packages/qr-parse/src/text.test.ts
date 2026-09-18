import { describe, expect, it } from 'vitest';
import { parseKeyValuePayload, parseUrlPayload, parseMonthLoose } from './text';

describe('parseMonthLoose', () => {
  it('accepts 2-digit years on top of @asli/matching formats', () => {
    expect(parseMonthLoose('03/26')).toBe('2026-03');
    expect(parseMonthLoose('2025-08')).toBe('2025-08');
  });

  it('returns undefined for garbage', () => {
    expect(parseMonthLoose('not a date')).toBeUndefined();
  });
});

describe('parseUrlPayload', () => {
  it('extracts batch, dates, product and manufacturer from query params', () => {
    const fields = parseUrlPayload(
      'https://verify.example.com/m?b=ABC123&e=03/26&m=01/24&name=Amoxicillin&mfr=Cipla',
    );
    expect(fields).toEqual({
      batchNumber: 'ABC123',
      expMonth: '2026-03',
      mfgMonth: '2024-01',
      productName: 'Amoxicillin',
      manufacturer: 'Cipla',
    });
  });

  it('returns undefined for a URL with no recognized params', () => {
    expect(parseUrlPayload('https://example.com/m?foo=bar')).toBeUndefined();
  });

  it('returns undefined for non-URL text', () => {
    expect(parseUrlPayload('Batch: ABC123')).toBeUndefined();
  });
});

describe('parseKeyValuePayload', () => {
  it('parses labelled lines separated by newlines', () => {
    const fields = parseKeyValuePayload('Batch: GTL1258\nExp: 08/2026\nMfr: Cipla Ltd');
    expect(fields).toEqual({
      batchNumber: 'GTL1258',
      expMonth: '2026-08',
      manufacturer: 'Cipla Ltd',
    });
  });

  it('parses labelled pairs separated by semicolons', () => {
    const fields = parseKeyValuePayload('B.No=RPL-1013; Exp=03/26; Name=Paracetamol');
    expect(fields).toEqual({
      batchNumber: 'RPL-1013',
      expMonth: '2026-03',
      productName: 'Paracetamol',
    });
  });

  it('returns undefined when nothing recognizable is found', () => {
    expect(parseKeyValuePayload('just some random text')).toBeUndefined();
  });
});
