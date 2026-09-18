import { describe, expect, it } from 'vitest';
import { classifyMfrSimilarity, manufacturerSimilarity } from './similarity';

describe('manufacturerSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(manufacturerSimilarity('CIPLA', 'CIPLA')).toBe(1);
  });

  it('returns 1 when one whole-token-contains the other with a qualifying token', () => {
    expect(manufacturerSimilarity('CIPLA', 'CIPLA HEALTH')).toBe(1);
  });

  it('does not treat containment as a match without a token of length >= 4', () => {
    // "GO" contained in "GO LTD" but neither token reaches length 4
    expect(manufacturerSimilarity('GO', 'GO CO')).toBeLessThan(1);
  });

  it('computes token-set Jaccard for partial overlap', () => {
    const score = manufacturerSimilarity('SUNRISE PHARMA', 'SUNRISE LABS');
    // {SUNRISE,PHARMA} vs {SUNRISE,LABS}: intersection 1, union 3
    expect(score).toBeCloseTo(1 / 3, 5);
  });

  it('returns 0 for completely disjoint strings', () => {
    expect(manufacturerSimilarity('CIPLA', 'ZENOVA')).toBe(0);
  });

  it('returns 0 when either side is empty', () => {
    expect(manufacturerSimilarity('', 'CIPLA')).toBe(0);
    expect(manufacturerSimilarity('CIPLA', '')).toBe(0);
  });

  it('returns 0 when both sides tokenize to nothing (whitespace only)', () => {
    expect(manufacturerSimilarity(' ', '  ')).toBe(0);
  });

  it('handles the longer-first-argument case the same as the shorter-first case', () => {
    // tokensA (3) > tokensB (1): exercises the [smaller, larger] = ... false branch.
    expect(manufacturerSimilarity('SUNRISE HEALTH TRADING', 'SUNRISE')).toBe(1);
  });
});

describe('classifyMfrSimilarity thresholds', () => {
  it.each([
    [1, 'STRONG'],
    [0.6, 'STRONG'],
    [0.59, 'WEAK'],
    [0.3, 'WEAK'],
    [0.29, 'MISMATCH'],
    [0, 'MISMATCH'],
  ])('classifyMfrSimilarity(%s) === %s', (score, expected) => {
    expect(classifyMfrSimilarity(score)).toBe(expected);
  });
});
