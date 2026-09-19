import { describe, expect, it } from 'vitest';
import { parseBillFromLines, parseBillFromTable } from './parse-bill';

describe('parseBillFromTable', () => {
  it('maps columns by header text regardless of order', () => {
    const rows = [
      ['Item', 'Batch', 'Qty', 'Exp', 'MRP'],
      ['Amoxicillin 500mg', 'GTL1258', '10', '10/2026', '450.00'],
      ['Paracetamol', 'PT2201', '20', '03/2027', '120.00'],
    ];

    const result = parseBillFromTable(rows);

    expect(result?.isPharmacyBill).toBe(true);
    expect(result?.lines).toHaveLength(2);
    expect(result?.lines[0]).toMatchObject({ productName: 'Amoxicillin 500mg', batchNumber: 'GTL1258', mrp: '450.00' });
    expect(result?.lines[0]?.quantity).toBe(10);
  });

  it('returns null when no batch-like column header is found', () => {
    const rows = [
      ['Item', 'Price'],
      ['Amoxicillin', '450.00'],
    ];

    expect(parseBillFromTable(rows)).toBeNull();
  });

  it('returns null for a header-only table', () => {
    expect(parseBillFromTable([['Item', 'Batch']])).toBeNull();
  });
});

describe('parseBillFromLines', () => {
  it('extracts a line with a batch-like token and ignores totals/tax lines', () => {
    const lines = ['Amoxicillin 500mg GTL1258 Qty: 10 Rs. 450.00', 'Subtotal Rs. 450.00', 'GST 18%'];

    const result = parseBillFromLines(lines);

    expect(result.isPharmacyBill).toBe(true);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.batchNumber).toBe('GTL1258');
    expect(result.lines[0]?.quantity).toBe(10);
  });

  it('drops lines with no batch-like token instead of inventing one', () => {
    const result = parseBillFromLines(['Paracetamol Tablets 10 strips']);

    expect(result.lines).toHaveLength(0);
    expect(result.isPharmacyBill).toBe(false);
  });
});
