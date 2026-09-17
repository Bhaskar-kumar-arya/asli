import type { ReasonCode } from '@asli/contracts';
import type { ReasonClassifier } from './types';

/**
 * docs/SAFETY_AND_CONTENT.md "Reason codes and plain-language text" table, in
 * the order given there. First matching keyword wins - checked top to bottom,
 * so e.g. "content of" (ASSAY) is tried before "content uniformity" (UNIFORMITY)
 * would otherwise both match a substring of the same sentence.
 * packages/content/reasons (lane I) is where the templates for these codes
 * live; this file only owns the classification rule, not the copy.
 */
const KEYWORD_RULES: Array<{ code: ReasonCode; keywords: string[] }> = [
  { code: 'DISSOLUTION', keywords: ['dissolution'] },
  { code: 'ASSAY', keywords: ['assay', 'content of'] },
  { code: 'IDENTIFICATION', keywords: ['identification'] },
  { code: 'DISINTEGRATION', keywords: ['disintegration'] },
  { code: 'STERILITY', keywords: ['sterility'] },
  { code: 'PARTICULATE', keywords: ['particulate', 'visible particles'] },
  { code: 'MICROBIAL', keywords: ['microbial', 'bacterial endotoxin'] },
  { code: 'RELATED_SUBSTANCES', keywords: ['related substances', 'impurities'] },
  { code: 'PH', keywords: ['ph '] },
  { code: 'DESCRIPTION', keywords: ['description', 'appearance'] },
  { code: 'UNIFORMITY', keywords: ['uniformity of weight', 'content uniformity'] },
  { code: 'LABELLING', keywords: ['label', 'misbranded'] },
  { code: 'SPURIOUS', keywords: ['spurious'] },
];

/**
 * Deterministic keyword classifier, tried before the injected reasonClassifier
 * (docs/DATA_SOURCES.md: "rule-based; Bedrock classifier only for unmapped,
 * output must be in enum, else OTHER" - that fallback is A2's call-site).
 */
export function classifyReasonByKeyword(reasonRaw: string): ReasonCode | null {
  const lower = reasonRaw.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.code;
    }
  }
  return null;
}

/** Default classifier when A2 hasn't injected a Bedrock-backed one: keyword rules, else OTHER. */
export const defaultReasonClassifier: ReasonClassifier = (reasonRaw) => classifyReasonByKeyword(reasonRaw) ?? 'OTHER';
