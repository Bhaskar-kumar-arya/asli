import { manufacturerSimilarity, normalizeBatch, normalizeManufacturer, batchSkeleton, parseMonth } from '@asli/matching';
import type { ExtractedItem } from '@asli/contracts';
import type { BillLineTruth, StripTruth } from './types';

/** docs/MATCHING.md STRONG threshold - reused here so "manufacturer read correctly" means the same thing as matching does. */
const MFR_STRONG_THRESHOLD = 0.6;

export interface StripFieldScores {
  batchExact: boolean;
  batchSkeletonMatch: boolean;
  manufacturerStrong: boolean;
  expiryExact: boolean;
}

/** Scores one extracted strip identity against its ground truth. docs/TESTING.md "Accuracy metrics". */
export function scoreStrip(truth: StripTruth, extracted: ExtractedItem | undefined): StripFieldScores {
  if (!extracted) {
    return { batchExact: false, batchSkeletonMatch: false, manufacturerStrong: false, expiryExact: false };
  }

  const truthBatchNorm = normalizeBatch(truth.batchNumber);
  const extractedBatchNorm = normalizeBatch(extracted.batchNumber ?? '');
  const batchExact = truthBatchNorm.length > 0 && truthBatchNorm === extractedBatchNorm;
  const batchSkeletonMatch =
    !batchExact && batchSkeleton(truthBatchNorm) === batchSkeleton(extractedBatchNorm) && extractedBatchNorm.length > 0;

  const manufacturerStrong =
    truth.manufacturer !== undefined &&
    extracted.manufacturer !== undefined &&
    manufacturerSimilarity(normalizeManufacturer(truth.manufacturer), normalizeManufacturer(extracted.manufacturer)) >=
      MFR_STRONG_THRESHOLD;

  const truthExpMonth = truth.expMonth ? parseMonth(truth.expMonth) : null;
  const extractedExpMonth = extracted.expMonth ? parseMonth(extracted.expMonth) : null;
  const expiryExact = truthExpMonth !== null && truthExpMonth === extractedExpMonth;

  return { batchExact, batchSkeletonMatch, manufacturerStrong, expiryExact };
}

export interface BillLineScore {
  truthLine: BillLineTruth;
  matched: ExtractedItem | undefined;
  batchExact: boolean;
}

/**
 * Greedy line recall: each truth line is matched to the first unused extracted
 * line whose normalized batch number is exact, per docs/TESTING.md "Bill: line recall".
 */
export function scoreBillLines(truthLines: BillLineTruth[], extractedLines: ExtractedItem[]): BillLineScore[] {
  const remaining = [...extractedLines];
  return truthLines.map((truthLine) => {
    if (!truthLine.batchNumber) {
      return { truthLine, matched: undefined, batchExact: false };
    }
    const truthNorm = normalizeBatch(truthLine.batchNumber);
    const idx = remaining.findIndex((e) => normalizeBatch(e.batchNumber ?? '') === truthNorm);
    if (idx === -1) {
      return { truthLine, matched: undefined, batchExact: false };
    }
    const [matched] = remaining.splice(idx, 1);
    return { truthLine, matched, batchExact: true };
  });
}

export interface MethodBreakdown {
  method: string;
  count: number;
  batchExactRate: number;
}

export interface ConditionBreakdown {
  condition: string;
  value: string;
  count: number;
  batchExactRate: number;
}

export interface AccuracySummary {
  sampleSize: number;
  strips: {
    count: number;
    batchExactRate: number;
    batchSkeletonRate: number;
    manufacturerStrongRate: number;
    expiryExactRate: number;
  };
  bills: {
    count: number;
    lineRecall: number;
  };
  byMethod: MethodBreakdown[];
  byCondition: ConditionBreakdown[];
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export interface ScoredStripItem {
  id: string;
  method: string;
  conditions: Record<string, string | boolean>;
  scores: StripFieldScores;
}

export interface ScoredBillItem {
  id: string;
  method: string;
  conditions: Record<string, string | boolean>;
  lineRecall: number;
}

/** Aggregates per-item scores into the summary docs/TESTING.md asks for. */
export function summarize(strips: ScoredStripItem[], bills: ScoredBillItem[]): AccuracySummary {
  const stripCount = strips.length;
  const billCount = bills.length;

  const byMethodMap = new Map<string, { count: number; batchExact: number }>();
  const byConditionMap = new Map<string, { count: number; batchExact: number }>();

  for (const item of strips) {
    const bucket = byMethodMap.get(item.method) ?? { count: 0, batchExact: 0 };
    bucket.count += 1;
    if (item.scores.batchExact) bucket.batchExact += 1;
    byMethodMap.set(item.method, bucket);

    for (const [key, value] of Object.entries(item.conditions)) {
      const condKey = `${key}=${String(value)}`;
      const condBucket = byConditionMap.get(condKey) ?? { count: 0, batchExact: 0 };
      condBucket.count += 1;
      if (item.scores.batchExact) condBucket.batchExact += 1;
      byConditionMap.set(condKey, condBucket);
    }
  }

  for (const item of bills) {
    const bucket = byMethodMap.get(item.method) ?? { count: 0, batchExact: 0 };
    bucket.count += 1;
    byMethodMap.set(item.method, bucket);
  }

  return {
    sampleSize: stripCount + billCount,
    strips: {
      count: stripCount,
      batchExactRate: rate(strips.filter((s) => s.scores.batchExact).length, stripCount),
      batchSkeletonRate: rate(strips.filter((s) => s.scores.batchSkeletonMatch).length, stripCount),
      manufacturerStrongRate: rate(strips.filter((s) => s.scores.manufacturerStrong).length, stripCount),
      expiryExactRate: rate(strips.filter((s) => s.scores.expiryExact).length, stripCount),
    },
    bills: {
      count: billCount,
      lineRecall: rate(
        bills.reduce((sum, b) => sum + b.lineRecall, 0),
        billCount,
      ),
    },
    byMethod: [...byMethodMap.entries()].map(([method, v]) => ({
      method,
      count: v.count,
      batchExactRate: rate(v.batchExact, v.count),
    })),
    byCondition: [...byConditionMap.entries()].map(([key, v]) => {
      const [condition, value] = key.split('=');
      return { condition: condition ?? key, value: value ?? '', count: v.count, batchExactRate: rate(v.batchExact, v.count) };
    }),
  };
}
