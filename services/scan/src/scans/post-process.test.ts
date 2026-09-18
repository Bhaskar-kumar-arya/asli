import { describe, expect, it } from 'vitest';
import { processBillExtraction, processStripExtraction } from './post-process';
import type { BillExtraction, StripExtraction } from './extraction-schema';

const baseStrip: StripExtraction = {
  isMedicinePack: true,
  productName: 'Amoxicillin 500mg Capsules',
  brandName: null,
  batchNumber: 'GTL 1258',
  manufacturer: 'Gidsha Pharmaceuticals',
  mfgDate: null,
  expDate: '10/2026',
  strength: '500mg',
  dosageForm: 'Capsules',
  mrp: null,
  confidence: { batchNumber: 0.95, manufacturer: 0.9, productName: 0.9, expDate: 0.9 },
  notes: null,
};

describe('processStripExtraction', () => {
  it('builds a MedicineIdentity with no warnings for a confident, complete read', () => {
    const result = processStripExtraction(baseStrip);

    expect(result.warnings).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.identity).toMatchObject({
      productName: 'Amoxicillin 500mg Capsules',
      batchNumber: 'GTL 1258',
      manufacturer: 'Gidsha Pharmaceuticals',
      expMonth: '2026-10',
      source: 'strip_vision',
    });
    expect(result.items[0]?.brandQuery).toBeUndefined();
  });

  it('returns NOT_A_MEDICINE and no items when isMedicinePack is false', () => {
    const result = processStripExtraction({ ...baseStrip, isMedicinePack: false });
    expect(result).toEqual({ items: [], warnings: ['NOT_A_MEDICINE'] });
  });

  it('returns NO_BATCH_ON_LINE when batchNumber is null', () => {
    const result = processStripExtraction({ ...baseStrip, batchNumber: null });
    expect(result).toEqual({ items: [], warnings: ['NO_BATCH_ON_LINE'] });
  });

  it('returns NO_BATCH_ON_LINE when extraction failed entirely (null)', () => {
    const result = processStripExtraction(null);
    expect(result).toEqual({ items: [], warnings: ['NO_BATCH_ON_LINE'] });
  });

  it('adds LOW_READ_CONFIDENCE when batch confidence is below 0.7', () => {
    const result = processStripExtraction({ ...baseStrip, confidence: { ...baseStrip.confidence, batchNumber: 0.5 } });
    expect(result.warnings).toEqual(['LOW_READ_CONFIDENCE']);
  });

  it('sets brandQuery from brandName/productName when manufacturer is missing', () => {
    const result = processStripExtraction({ ...baseStrip, manufacturer: null, brandName: 'Amoxil' });
    expect(result.items[0]?.brandQuery).toBe('Amoxil');

    const noBrand = processStripExtraction({ ...baseStrip, manufacturer: null, brandName: null });
    expect(noBrand.items[0]?.brandQuery).toBe('Amoxicillin 500mg Capsules');
  });
});

const baseBill: BillExtraction = {
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
    {
      productName: 'Cough Syrup',
      batchNumber: null,
      expDate: null,
      manufacturer: null,
      quantity: 1,
      mrp: null,
      confidence: {},
    },
  ],
};

describe('processBillExtraction', () => {
  it('skips lines with no batch number, keeps the rest, and flags NO_BATCH_ON_LINE once', () => {
    const result = processBillExtraction(baseBill);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.identity.batchNumber).toBe('GTL1258');
    expect(result.warnings).toEqual(['NO_BATCH_ON_LINE']);
  });

  it('returns NOT_A_MEDICINE when isPharmacyBill is false', () => {
    const result = processBillExtraction({ isPharmacyBill: false, lines: [] });
    expect(result).toEqual({ items: [], warnings: ['NOT_A_MEDICINE'] });
  });

  it('returns NO_BATCH_ON_LINE when extraction failed entirely (null)', () => {
    const result = processBillExtraction(null);
    expect(result).toEqual({ items: [], warnings: ['NO_BATCH_ON_LINE'] });
  });
});
