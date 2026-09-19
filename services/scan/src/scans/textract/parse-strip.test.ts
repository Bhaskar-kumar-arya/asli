import { describe, expect, it } from 'vitest';
import { parseStripLines } from './parse-strip';

describe('parseStripLines', () => {
  it('reads batch, manufacturer, exp date, strength and dosage form off a labelled strip', () => {
    const lines = [
      'Amoxicillin 500mg Capsules',
      'B.No: GTL1258',
      'Mfd. by: Gidsha Pharmaceuticals',
      'Mfg Lic No: 25/KA/2019',
      'Exp: 10/2026',
      'MRP: Rs. 45.50',
    ];

    const result = parseStripLines(lines);

    expect(result.isMedicinePack).toBe(true);
    expect(result.batchNumber).toBe('GTL1258');
    expect(result.manufacturer).toBe('Gidsha Pharmaceuticals');
    expect(result.expDate).toBe('10/2026');
    expect(result.strength).toBe('500mg');
    expect(result.dosageForm).toBe('Capsules');
    expect(result.mrp).toBe('45.50');
    expect(result.confidence.batchNumber).toBeGreaterThan(0);
  });

  it('does not mistake a licence number line for a batch number', () => {
    const lines = ['Paracetamol Tablets', 'Mfg Lic No: 25/KA/2019', 'Batch: PT2201', 'Exp: 03/2027'];

    const result = parseStripLines(lines);

    expect(result.batchNumber).toBe('PT2201');
  });

  it('falls back to "Marketed by" as notes, not manufacturer, when no Mfd. by line exists', () => {
    const lines = ['Some Tablet', 'Batch: AB1234', 'Marketed by: Example Marketing Co'];

    const result = parseStripLines(lines);

    expect(result.manufacturer).toBeNull();
    expect(result.notes).toContain('Example Marketing Co');
  });

  it('marks isMedicinePack false when nothing pack-like is found', () => {
    const result = parseStripLines(['Random unrelated photo text']);

    expect(result.isMedicinePack).toBe(false);
    expect(result.batchNumber).toBeNull();
  });

  it('returns null fields rather than inventing values when a batch is missing', () => {
    const result = parseStripLines(['Cough Syrup 100ml', 'Exp: 2026-11']);

    expect(result.batchNumber).toBeNull();
    expect(result.isMedicinePack).toBe(true);
  });
});
