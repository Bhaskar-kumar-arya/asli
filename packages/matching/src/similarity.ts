import type { MfrSimilarityClass } from './types';

function tokensOf(s: string): string[] {
  return s.split(/\s+/).filter((t) => t.length > 0);
}

/**
 * docs/MATCHING.md manufacturerSimilarity.
 * `a` and `b` are already-normalized manufacturer strings (normalizeManufacturer output).
 */
export function manufacturerSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const tokensA = tokensOf(a);
  const tokensB = tokensOf(b);
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  const [smaller, larger] = tokensA.length <= tokensB.length ? [setA, setB] : [setB, setA];
  const smallerContainedInLarger = smaller.size > 0 && [...smaller].every((t) => larger.has(t));
  const hasQualifyingToken = [...smaller].some((t) => t.length >= 4);
  if (smallerContainedInLarger && hasQualifyingToken) return 1;

  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  let intersectionSize = 0;
  for (const t of setA) {
    if (setB.has(t)) intersectionSize += 1;
  }
  return intersectionSize / union.size;
}

export const MFR_SIMILARITY_THRESHOLDS = { STRONG: 0.6, WEAK: 0.3 } as const;

export function classifyMfrSimilarity(score: number): MfrSimilarityClass {
  if (score >= MFR_SIMILARITY_THRESHOLDS.STRONG) return 'STRONG';
  if (score >= MFR_SIMILARITY_THRESHOLDS.WEAK) return 'WEAK';
  return 'MISMATCH';
}
