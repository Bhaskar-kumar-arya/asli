import type { FlaggedBatch, MedicineIdentity } from '@asli/contracts';
import { describe, expect, it } from 'vitest';
import { classifyMatch } from './classify';
import type { MatchContext } from './types';

const ctx: MatchContext = { monthCount: 24, latestMonth: '2025-08' };

const gidsha: FlaggedBatch = {
  productName: 'Amoxicillin 500mg Capsules',
  batchRaw: 'GTL 1258',
  batchNorm: 'GTL1258',
  batchSkeleton: '6T11258',
  mfgMonth: null,
  expMonth: '2026-10',
  manufacturerRaw: 'M/s. Gidsha Pharmaceuticals Pvt. Ltd.',
  manufacturerNorm: 'GIDSHA',
  category: 'NSQ',
  reasonRaw: 'Assay',
  reasonCode: 'ASSAY',
  reportingSource: 'STATE_LAB',
  alertMonth: '2025-03',
  sourceUrl: 'https://example.com',
  snapshotKey: 'raw/x',
  rowHash: 'hash1',
  alertId: 'hash1',
  ingestedAt: '2025-03-05T00:00:00.000Z',
  demo: false,
};

function identity(overrides: Partial<MedicineIdentity>): MedicineIdentity {
  return { batchNumber: 'GTL1258', source: 'manual', ...overrides };
}

describe('classifyMatch - docs/MATCHING.md tier table', () => {
  it('row 1: batchNorm equal, mfr STRONG, no expiry contradiction -> FLAGGED', () => {
    const result = classifyMatch(identity({ manufacturer: 'Gidsha Pharmaceuticals' }), gidsha, ctx);
    expect(result.tier).toBe('FLAGGED');
    expect(result.reasonCodes).toEqual(['BATCH_EXACT', 'MFR_STRONG']);
    expect(result.collision).toBe(false);
  });

  it('row 2: batchNorm equal, mfr STRONG, both expiry known and differ -> VERIFY EXPIRY_DIFFERS', () => {
    const result = classifyMatch(identity({ manufacturer: 'Gidsha', expMonth: '2027-01' }), gidsha, ctx);
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toEqual(['BATCH_EXACT', 'MFR_STRONG', 'EXPIRY_DIFFERS']);
  });

  it('row 3: batchNorm equal, mfr WEAK -> VERIFY MFR_WEAK', () => {
    // gidsha's manufacturerNorm is a single token ("GIDSHA"), so any identity manufacturer
    // sharing that token whole-token-contains it and lands on STRONG (1.0), never WEAK - use
    // a two-token candidate instead so a genuine partial Jaccard overlap is reachable.
    const twoTokenCandidate: FlaggedBatch = { ...gidsha, manufacturerNorm: 'SUNRISE HEALTHCARE' };
    const result = classifyMatch(identity({ manufacturer: 'Sunrise Trading Co' }), twoTokenCandidate, ctx);
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toEqual(['BATCH_EXACT', 'MFR_WEAK']);
  });

  it('row 3: batchNorm equal, mfr unknown on the user side -> VERIFY MFR_UNKNOWN', () => {
    const result = classifyMatch(identity({}), gidsha, ctx);
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toEqual(['BATCH_EXACT', 'MFR_UNKNOWN']);
  });

  it('row 4: batchNorm equal, mfr unknown, but a STRONG brand->manufacturer candidate exists -> VERIFY MFR_FROM_BRAND_MAP, never FLAGGED', () => {
    const result = classifyMatch(identity({}), gidsha, {
      ...ctx,
      manufacturerCandidatesForBrand: [{ manufacturerNorm: 'GIDSHA', confidence: 0.9 }],
    });
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toEqual(['BATCH_EXACT', 'MFR_FROM_BRAND_MAP']);
  });

  it('row 5: batchNorm equal, mfr MISMATCH -> no match, collision flagged', () => {
    const result = classifyMatch(identity({ manufacturer: 'Cipla Ltd' }), gidsha, ctx);
    expect(result.tier).toBeNull();
    expect(result.collision).toBe(true);
    expect(result.reasonCodes).toEqual([]);
  });

  it('row 6: skeleton equal (batchNorm differs), mfr STRONG -> VERIFY BATCH_NEAR', () => {
    const result = classifyMatch(identity({ batchNumber: 'GTLI258', manufacturer: 'Gidsha' }), gidsha, ctx);
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toEqual(['BATCH_NEAR', 'MFR_STRONG']);
  });

  it('row 7: skeleton equal, mfr not STRONG (mismatch) -> no match', () => {
    const result = classifyMatch(identity({ batchNumber: 'GTLI258', manufacturer: 'Cipla Ltd' }), gidsha, ctx);
    expect(result.tier).toBeNull();
    expect(result.collision).toBe(false);
  });

  it('row 7: skeleton equal, mfr unknown on the user side -> no match', () => {
    const result = classifyMatch(identity({ batchNumber: 'GTLI258' }), gidsha, ctx);
    expect(result.tier).toBeNull();
  });

  it('row 8: nothing matches -> no match', () => {
    const result = classifyMatch(identity({ batchNumber: 'ZZZ999', manufacturer: 'Anyone' }), gidsha, ctx);
    expect(result.tier).toBeNull();
  });

  it('low read confidence caps a would-be FLAGGED at VERIFY and adds LOW_READ_CONFIDENCE', () => {
    const result = classifyMatch(
      identity({ manufacturer: 'Gidsha Pharmaceuticals', fieldConfidence: { batchNumber: 0.5 } }),
      gidsha,
      ctx,
    );
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toEqual(['BATCH_EXACT', 'MFR_STRONG', 'LOW_READ_CONFIDENCE']);
  });

  it('never returns FLAGGED when identity.manufacturer is empty', () => {
    const result = classifyMatch(identity({}), gidsha, ctx);
    expect(result.tier).not.toBe('FLAGGED');
  });
});
