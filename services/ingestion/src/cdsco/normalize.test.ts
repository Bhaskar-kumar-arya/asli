import { describe, expect, it } from 'vitest';
import { FlaggedBatchSchema } from '@asli/contracts';
import { normalizeRows } from './normalize';
import type { ParsedRow } from './types';

function row(overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    productName: 'Paracetamol',
    batchRaw: 'ABC123',
    mfgRaw: 'Aug-2025',
    expRaw: 'Jul-2027',
    manufacturerRaw: 'Cipla Ltd., Plot No. 9',
    reasonRaw: 'Assay of Paracetamol IP',
    reportingSourceRaw: 'State Lab',
    reportingLab: 'FDTL,Uttarakhand',
    category: 'NSQ',
    alertMonth: '2026-02',
    sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq',
    snapshotKey: 'raw/cdsco/endpoint/2026-02/nsq/abc.json',
    ...overrides,
  };
}

describe('normalizeRows', () => {
  it('produces a schema-valid FlaggedBatch for a well-formed row', async () => {
    const [batch] = await normalizeRows([row()]);
    expect(() => FlaggedBatchSchema.parse(batch)).not.toThrow();
    expect(batch!.manufacturerNorm).toBe('CIPLA');
    expect(batch!.reasonCode).toBe('ASSAY');
    expect(batch!.reportingSource).toBe('STATE_LAB');
    expect(batch!.alertId).toBe(batch!.rowHash);
    expect(batch!.demo).toBe(false);
  });

  it('skips rows with no usable batch number without dropping the rest of the month', async () => {
    const batches = await normalizeRows([row({ batchRaw: '' }), row({ batchRaw: 'DEF456' })]);
    expect(batches).toHaveLength(1);
    expect(batches[0]!.batchRaw).toBe('DEF456');
  });

  it.each([
    ['Mon-YYYY', 'Aug-2025', '2025-08'],
    ['MM/YYYY', '08/2025', '2025-08'],
    ['DD/MM/YYYY', '15/08/2025', '2025-08'],
    ['MON-YYYY uppercase', 'AUG-2025', '2025-08'],
    ['full month name', 'August-2025', '2025-08'],
    ['ISO', '2025-08', '2025-08'],
  ])('parses mfgMonth format %s (%s -> %s)', async (_label, raw, expected) => {
    const [batch] = await normalizeRows([row({ mfgRaw: raw })]);
    expect(batch!.mfgMonth).toBe(expected);
  });

  it('sets mfgMonth/expMonth to null for an unparseable date rather than throwing', async () => {
    const [batch] = await normalizeRows([row({ mfgRaw: 'garbage', expRaw: '' })]);
    expect(batch!.mfgMonth).toBeNull();
    expect(batch!.expMonth).toBeNull();
  });

  it('reuses the deterministic keyword reason classifier before falling back to deps.reasonClassifier', async () => {
    const reasonClassifier = () => {
      throw new Error('should not be called - keyword rules already matched');
    };
    const [batch] = await normalizeRows([row({ reasonRaw: 'Dissolution test failed' })], { reasonClassifier });
    expect(batch!.reasonCode).toBe('DISSOLUTION');
  });

  it('falls back to the injected reasonClassifier for reasonRaw the keyword rules dont cover', async () => {
    const [batch] = await normalizeRows([row({ reasonRaw: 'some novel failure mode' })], {
      reasonClassifier: () => 'OTHER',
    });
    expect(batch!.reasonCode).toBe('OTHER');
  });

  it('applies the alias map to the normalized manufacturer name', async () => {
    const [batch] = await normalizeRows([row({ manufacturerRaw: 'Some Obscure Name Pvt Ltd' })], {
      aliases: { 'SOME OBSCURE NAME': 'CANONICAL_MFR' },
    });
    expect(batch!.manufacturerNorm).toBe('CANONICAL_MFR');
  });

  it('computes rowHash as sha256 of alertMonth+category+batchNorm+manufacturerNorm+productName', async () => {
    const [batch] = await normalizeRows([row()]);
    expect(batch!.rowHash).toMatch(/^[a-f0-9]{64}$/);
    const [batchAgain] = await normalizeRows([row()]);
    expect(batchAgain!.rowHash).toBe(batch!.rowHash); // deterministic, not time-based
  });
});
