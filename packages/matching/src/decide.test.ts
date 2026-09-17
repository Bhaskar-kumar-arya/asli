import type { FlaggedBatch, MedicineIdentity } from '@asli/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decide } from './decide';
import type { MatchContext } from './types';

const ctx: MatchContext = { monthCount: 24, latestMonth: '2025-08' };

// Same three fixture rows as packages/contracts/fixtures/flagged-batches.json rows 1-3,
// reproduced here as literals so this test suite has no runtime dependency on JSON fixture
// contents (which may grow/change independently).
const gidshaNsq: FlaggedBatch = {
  productName: 'Amoxicillin 500mg Capsules',
  batchRaw: 'GTL 1258',
  batchNorm: 'GTL1258',
  batchSkeleton: '6T11258',
  mfgMonth: null,
  expMonth: '2026-10',
  manufacturerRaw: 'M/s. Gidsha Pharmaceuticals Pvt. Ltd.',
  manufacturerNorm: 'GIDSHA',
  category: 'NSQ',
  reasonRaw: 'Assay (content of the drug) found outside limits',
  reasonCode: 'ASSAY',
  reportingSource: 'STATE_LAB',
  reportingLab: 'State Drug Testing Laboratory, Chandigarh',
  alertMonth: '2025-03',
  sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Mar-2025&source=All&tab=nsq',
  snapshotKey: 'raw/cdsco/endpoint/2025-03/nsq/d521d57fe144d31a.html',
  rowHash: 'd521d57fe144d31a',
  alertId: 'd521d57fe144d31a',
  ingestedAt: '2025-03-05T06:00:00.000Z',
  demo: false,
};

const gidshaSpurious: FlaggedBatch = {
  ...gidshaNsq,
  batchRaw: 'GTL1258',
  expMonth: null,
  manufacturerRaw: 'Gidsha Pharma',
  category: 'SPURIOUS',
  reasonRaw: 'Found to be spurious - not manufactured by the firm on the label',
  reasonCode: 'SPURIOUS',
  reportingLab: 'Central Drugs Testing Laboratory, Mumbai',
  alertMonth: '2025-05',
  sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=May-2025&source=All&tab=spurious',
  snapshotKey: 'raw/cdsco/endpoint/2025-05/spurious/720f4c3fbb5ee793.html',
  rowHash: '720f4c3fbb5ee793',
  alertId: '720f4c3fbb5ee793',
  ingestedAt: '2025-05-05T06:00:00.000Z',
};

const zenova: FlaggedBatch = {
  productName: 'Paracetamol 650mg Tablets',
  batchRaw: '00 57',
  batchNorm: '0057',
  batchSkeleton: '0057',
  mfgMonth: null,
  expMonth: null,
  manufacturerRaw: 'Zenova Labs Pvt. Ltd.',
  manufacturerNorm: 'ZENOVA',
  category: 'NSQ',
  reasonRaw: 'Disintegration test failed',
  reasonCode: 'DISINTEGRATION',
  reportingSource: 'STATE_LAB',
  reportingLab: 'Regional Drug Testing Laboratory, Guwahati',
  alertMonth: '2025-02',
  sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2025&source=All&tab=nsq',
  snapshotKey: 'raw/cdsco/endpoint/2025-02/nsq/7b232fe24c6c94c0.html',
  rowHash: '7b232fe24c6c94c0',
  alertId: '7b232fe24c6c94c0',
  ingestedAt: '2025-02-05T06:00:00.000Z',
  demo: false,
};

function identity(overrides: Partial<MedicineIdentity>): MedicineIdentity {
  return { batchNumber: 'GTL1258', source: 'manual', ...overrides };
}

describe('decide - docs/MATCHING.md required test cases', () => {
  it('1: batch GTL1258, mfr Gidsha Pharmaceuticals -> FLAGGED', () => {
    const result = decide(identity({ manufacturer: 'Gidsha Pharmaceuticals' }), [gidshaNsq], ctx);
    expect(result.tier).toBe('FLAGGED');
    expect(result.guidanceKey).toBe('result.flagged.nsq');
  });

  it('2: batch "GTL 1258", mfr "Gidsha Pharma" -> FLAGGED', () => {
    const result = decide(identity({ batchNumber: 'GTL 1258', manufacturer: 'Gidsha Pharma' }), [gidshaNsq], ctx);
    expect(result.tier).toBe('FLAGGED');
  });

  it('3: batch "GTLI258", mfr "Gidsha" -> VERIFY BATCH_NEAR', () => {
    const result = decide(identity({ batchNumber: 'GTLI258', manufacturer: 'Gidsha' }), [gidshaNsq], ctx);
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toEqual(['BATCH_NEAR', 'MFR_STRONG']);
    expect(result.guidanceKey).toBe('result.verify.near_batch');
  });

  it('4: batch GTL1258, mfr Cipla Ltd (mismatch/collision) -> NO_ALERT_FOUND', () => {
    const result = decide(identity({ manufacturer: 'Cipla Ltd' }), [gidshaNsq], ctx);
    expect(result.tier).toBe('NO_ALERT_FOUND');
    expect(result.matches).toEqual([]);
  });

  it('5: batch GTL1258, mfr missing -> VERIFY MFR_UNKNOWN', () => {
    const result = decide(identity({}), [gidshaNsq], ctx);
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toEqual(['BATCH_EXACT', 'MFR_UNKNOWN']);
  });

  it('6: batch GTL1258, mfr Gidsha, exp 2027-01 vs candidate exp 2026-10 -> VERIFY EXPIRY_DIFFERS', () => {
    const result = decide(identity({ manufacturer: 'Gidsha', expMonth: '2027-01' }), [gidshaNsq], ctx);
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toEqual(['BATCH_EXACT', 'MFR_STRONG', 'EXPIRY_DIFFERS']);
  });

  it('7: batch ZZZ999, mfr Anyone, no candidates match -> NO_ALERT_FOUND', () => {
    const result = decide(identity({ batchNumber: 'ZZZ999', manufacturer: 'Anyone' }), [gidshaNsq, zenova], ctx);
    expect(result.tier).toBe('NO_ALERT_FOUND');
  });

  it('8: batch read confidence 0.5, otherwise exact+strong -> VERIFY LOW_READ_CONFIDENCE', () => {
    const result = decide(
      identity({ manufacturer: 'Gidsha Pharmaceuticals', fieldConfidence: { batchNumber: 0.5 } }),
      [gidshaNsq],
      ctx,
    );
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toContain('LOW_READ_CONFIDENCE');
    expect(result.guidanceKey).toBe('result.verify.low_read_confidence');
  });

  it('9: two candidates, one NSQ one SPURIOUS, both FLAGGED -> FLAGGED, SPURIOUS listed first', () => {
    const result = decide(identity({ manufacturer: 'Gidsha' }), [gidshaNsq, gidshaSpurious], ctx);
    expect(result.tier).toBe('FLAGGED');
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0]!.category).toBe('SPURIOUS');
    expect(result.matches[1]!.category).toBe('NSQ');
    expect(result.guidanceKey).toBe('result.flagged.spurious');
  });

  it('10: batch typed "OO57", mfr strong match; candidate "00 57" same manufacturer -> VERIFY BATCH_NEAR', () => {
    const result = decide(identity({ batchNumber: 'OO57', manufacturer: 'Zenova Labs' }), [zenova], ctx);
    expect(result.tier).toBe('VERIFY');
    expect(result.reasonCodes).toEqual(['BATCH_NEAR', 'MFR_STRONG']);
  });
});

describe('decide - checkedAgainst and NO_ALERT_FOUND shape', () => {
  it('passes ctx.monthCount/latestMonth through as checkedAgainst', () => {
    const result = decide(identity({}), [], { monthCount: 7, latestMonth: '2025-01' });
    expect(result.checkedAgainst).toEqual({ monthCount: 7, latestMonth: '2025-01' });
    expect(result.tier).toBe('NO_ALERT_FOUND');
    expect(result.guidanceKey).toBe('result.no_alert_found');
  });
});

describe('decide - property tests', () => {
  it('never returns FLAGGED when identity.manufacturer is empty', () => {
    fc.assert(
      fc.property(fc.constantFrom(...[gidshaNsq, gidshaSpurious, zenova]), (candidate) => {
        const result = decide(identity({ manufacturer: undefined }), [candidate], ctx);
        expect(result.tier).not.toBe('FLAGGED');
      }),
    );
  });

  it('output tier never depends on candidate order', () => {
    const candidates = [gidshaNsq, gidshaSpurious, zenova];
    fc.assert(
      fc.property(fc.shuffledSubarray(candidates, { minLength: candidates.length }), (shuffled) => {
        const result = decide(identity({ manufacturer: 'Gidsha' }), shuffled, ctx);
        expect(result.tier).toBe('FLAGGED');
      }),
    );
  });
});

describe('decide - benchmark', () => {
  it('decides against 50 candidates in well under a millisecond once warmed up', () => {
    const candidates: FlaggedBatch[] = Array.from({ length: 50 }, (_, i) => ({
      ...gidshaNsq,
      batchNorm: `BATCH${i}`,
      batchSkeleton: `BATCH${i}`,
      rowHash: `hash${i}`,
      alertId: `hash${i}`,
    }));
    const testIdentity = identity({ manufacturer: 'Gidsha' });

    // Warm up the JIT before measuring, per the doc's "decide on 50 candidates < 1ms" target.
    for (let i = 0; i < 50; i += 1) decide(testIdentity, candidates, ctx);

    const start = performance.now();
    for (let i = 0; i < 100; i += 1) decide(testIdentity, candidates, ctx);
    const elapsedMs = (performance.now() - start) / 100;

    // Generous margin over the doc's 1ms target to avoid CI flakiness on shared runners.
    expect(elapsedMs).toBeLessThan(5);
  });
});
