import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { batchSkeleton, normalizeBatch, normalizeManufacturer, parseMonth } from './normalize';

describe('normalizeBatch', () => {
  it.each([
    ['GTL 1258', 'GTL1258'],
    ['B.No: RPL-1013', 'RPL1013'],
    ['00 57', '0057'],
    ['GTL1258', 'GTL1258'],
    ['gtl-1258', 'GTL1258'],
    ['Batch No: AB.12/34', 'AB1234'],
    ['Lot 99', '99'],
  ])('normalizeBatch(%s) === %s', (raw, expected) => {
    expect(normalizeBatch(raw)).toBe(expected);
  });

  it('does not strip a real batch number that merely starts with a label word with no separator', () => {
    expect(normalizeBatch('LOT2024001')).toBe('LOT2024001');
    expect(normalizeBatch('BATCH99')).toBe('BATCH99');
  });

  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        const once = normalizeBatch(raw);
        const twice = normalizeBatch(once);
        expect(twice).toBe(once);
      }),
    );
  });
});

describe('batchSkeleton', () => {
  it.each([
    ['GTLI258', '6T11258'],
    ['GTL1258', '6T11258'],
    ['0057', '0057'],
    ['OO57', '0057'],
  ])('batchSkeleton(%s) === %s', (norm, expected) => {
    expect(batchSkeleton(norm)).toBe(expected);
  });
});

describe('normalizeManufacturer', () => {
  it.each([
    ['M/s. Cipla Ltd., Plot No. 9', 'CIPLA'],
    ['M/s. Gidsha Pharmaceuticals Pvt. Ltd.', 'GIDSHA'],
    ['Gidsha Pharma', 'GIDSHA'],
    ['Zenova Labs Pvt. Ltd.', 'ZENOVA'],
  ])('normalizeManufacturer(%s) === %s', (raw, expected) => {
    expect(normalizeManufacturer(raw)).toBe(expected);
  });

  it('applies an alias map to the normalized result', () => {
    expect(normalizeManufacturer('Acme Labs Pvt Ltd', { ACME: 'ACME_CANONICAL' })).toBe('ACME_CANONICAL');
  });

  it('cuts the address at a 6-digit PIN with no comma present', () => {
    expect(normalizeManufacturer('Trident Pharmaceuticals 380015')).toBe('TRIDENT');
  });
});

describe('parseMonth', () => {
  it.each([
    ['Aug-2025', '2025-08'],
    ['AUG-2025', '2025-08'],
    ['August 2025', '2025-08'],
    ['08/2025', '2025-08'],
    ['12/12/2024', '2024-12'],
    ['2025-08', '2025-08'],
  ])('parseMonth(%s) === %s', (raw, expected) => {
    expect(parseMonth(raw)).toBe(expected);
  });

  it.each([['not a date'], ['13/2025'], [''], ['2025-13'], ['31/13/2024'], ['XYZ-2025']])(
    'parseMonth(%s) === null',
    (raw) => {
      expect(parseMonth(raw)).toBeNull();
    },
  );
});
