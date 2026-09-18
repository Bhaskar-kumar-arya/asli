import { describe, expect, it } from 'vitest';
import { MAX_ROWS, parsePharmacyCsv } from './csv';
import { ApiError } from './http';

describe('parsePharmacyCsv', () => {
  it('maps columns by header, case-insensitively and in any order', () => {
    const csv = ['Batch,Product,Manufacturer,Expiry,Quantity', 'GTL1258,Paracetamol,Cipla,2027-01,10'].join('\n');
    const rows = parsePharmacyCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.identity).toMatchObject({
      batchNumber: 'GTL1258',
      productName: 'Paracetamol',
      manufacturer: 'Cipla',
      expMonth: '2027-01',
      quantity: 10,
      source: 'pharmacy_csv',
    });
  });

  it('drops rows missing a batch number', () => {
    const csv = ['product,batch,manufacturer,expiry,quantity', 'Paracetamol,,Cipla,2027-01,10'].join('\n');
    const rows = parsePharmacyCsv(csv);
    expect(rows).toHaveLength(0);
  });

  it('sets brandQuery when manufacturer is missing but a product name is present', () => {
    const csv = ['product,batch', 'Paracetamol,GTL1258'].join('\n');
    const rows = parsePharmacyCsv(csv);
    expect(rows[0]?.brandQuery).toBe('Paracetamol');
  });

  it('throws BAD_REQUEST when there is no batch column', () => {
    expect(() => parsePharmacyCsv('product,manufacturer\nParacetamol,Cipla')).toThrow(ApiError);
  });

  it('throws BAD_REQUEST when there are no rows at all', () => {
    expect(() => parsePharmacyCsv('')).toThrow(ApiError);
  });

  it('throws BAD_REQUEST when the row count exceeds MAX_ROWS', () => {
    const header = 'batch';
    const rows = Array.from({ length: MAX_ROWS + 1 }, (_, i) => `B${i}`);
    expect(() => parsePharmacyCsv([header, ...rows].join('\n'))).toThrow(ApiError);
  });

  it('handles quoted fields containing commas', () => {
    const csv = ['product,batch', '"Acme, Inc. Syrup",GTL1258'].join('\n');
    const rows = parsePharmacyCsv(csv);
    expect(rows[0]?.identity.productName).toBe('Acme, Inc. Syrup');
  });
});
