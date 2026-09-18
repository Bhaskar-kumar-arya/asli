import { describe, expect, it } from 'vitest';
import type { ExtractedItem } from '@asli/contracts';
import { scoreBillLines, scoreStrip, summarize, type ScoredBillItem, type ScoredStripItem } from './score';

const extracted = (over: Partial<ExtractedItem> = {}): ExtractedItem => ({
  batchNumber: 'GTL1258',
  source: 'strip_vision',
  ...over,
});

describe('scoreStrip', () => {
  it('scores an exact batch and manufacturer match', () => {
    const result = scoreStrip(
      { batchNumber: 'GTL 1258', manufacturer: 'Gidsha Pharmaceuticals', expMonth: '2026-10' },
      extracted({ manufacturer: 'Gidsha Pharma', expMonth: '2026-10' }),
    );
    expect(result.batchExact).toBe(true);
    expect(result.batchSkeletonMatch).toBe(false);
    expect(result.manufacturerStrong).toBe(true);
    expect(result.expiryExact).toBe(true);
  });

  it('scores a near (skeleton) batch match as not exact', () => {
    const result = scoreStrip({ batchNumber: 'GTLI258' }, extracted({ batchNumber: 'GTL1258' }));
    expect(result.batchExact).toBe(false);
    expect(result.batchSkeletonMatch).toBe(true);
  });

  it('handles a missing extraction (extraction failed)', () => {
    const result = scoreStrip({ batchNumber: 'GTL1258' }, undefined);
    expect(result).toEqual({ batchExact: false, batchSkeletonMatch: false, manufacturerStrong: false, expiryExact: false });
  });

  it('does not credit manufacturer match when either side is missing', () => {
    const result = scoreStrip({ batchNumber: 'GTL1258' }, extracted({ manufacturer: undefined }));
    expect(result.manufacturerStrong).toBe(false);
  });
});

describe('scoreBillLines', () => {
  it('matches lines by exact normalized batch, greedily without reuse', () => {
    const truth = [{ batchNumber: 'GTL1258' }, { batchNumber: 'ABC999' }];
    const found = [extracted({ batchNumber: 'GTL 1258' }), extracted({ batchNumber: 'XYZ111' })];
    const result = scoreBillLines(truth, found);
    expect(result[0]?.batchExact).toBe(true);
    expect(result[1]?.batchExact).toBe(false);
  });

  it('does not match a truth line with no batch number', () => {
    const result = scoreBillLines([{ productName: 'Paracetamol' }], [extracted()]);
    expect(result[0]?.batchExact).toBe(false);
  });
});

describe('summarize', () => {
  it('aggregates rates and breakdowns from scored items', () => {
    const strips: ScoredStripItem[] = [
      {
        id: 's1',
        method: 'strip_vision',
        conditions: { foil: true, lighting: 'good' },
        scores: { batchExact: true, batchSkeletonMatch: false, manufacturerStrong: true, expiryExact: true },
      },
      {
        id: 's2',
        method: 'strip_vision',
        conditions: { foil: false, lighting: 'poor' },
        scores: { batchExact: false, batchSkeletonMatch: true, manufacturerStrong: false, expiryExact: false },
      },
    ];
    const bills: ScoredBillItem[] = [{ id: 'b1', method: 'bill_vision', conditions: {}, lineRecall: 0.5 }];

    const summary = summarize(strips, bills);
    expect(summary.sampleSize).toBe(3);
    expect(summary.strips.batchExactRate).toBeCloseTo(0.5);
    expect(summary.strips.batchSkeletonRate).toBeCloseTo(0.5);
    expect(summary.bills.lineRecall).toBeCloseTo(0.5);
    const method = summary.byMethod.find((m) => m.method === 'strip_vision');
    expect(method?.count).toBe(2);
    expect(method?.batchExactRate).toBeCloseTo(0.5);
    const condition = summary.byCondition.find((c) => c.condition === 'foil' && c.value === 'true');
    expect(condition?.count).toBe(1);
  });

  it('returns zero rates instead of NaN when there are no items', () => {
    const summary = summarize([], []);
    expect(summary.strips.batchExactRate).toBe(0);
    expect(summary.bills.lineRecall).toBe(0);
  });
});
