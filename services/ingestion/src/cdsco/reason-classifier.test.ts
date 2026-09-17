import { describe, expect, it } from 'vitest';
import { classifyReasonByKeyword, defaultReasonClassifier } from './reason-classifier';

describe('classifyReasonByKeyword', () => {
  it.each([
    ['Failed dissolution test', 'DISSOLUTION'],
    ['Assay of Paracetamol IP', 'ASSAY'],
    ['content of Metformin found low', 'ASSAY'],
    ['Identification test negative', 'IDENTIFICATION'],
    ['Disintegration time exceeded', 'DISINTEGRATION'],
    ['Failed sterility test', 'STERILITY'],
    ['Visible particles observed', 'PARTICULATE'],
    ['Microbial contamination found', 'MICROBIAL'],
    ['Related substances above limit', 'RELATED_SUBSTANCES'],
    ['pH out of range', 'PH'],
    ['Description does not match', 'DESCRIPTION'],
    ['Content uniformity failed', 'UNIFORMITY'],
    ['Misbranded label', 'LABELLING'],
    ['Reported as spurious', 'SPURIOUS'],
  ] as const)('classifies %j as %s', (raw, expected) => {
    expect(classifyReasonByKeyword(raw)).toBe(expected);
  });

  it('returns null for wording matching no rule', () => {
    expect(classifyReasonByKeyword('some entirely novel failure mode')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(classifyReasonByKeyword('ASSAY OF PARACETAMOL')).toBe('ASSAY');
  });
});

describe('defaultReasonClassifier', () => {
  it('falls back to OTHER when no keyword matches', () => {
    expect(defaultReasonClassifier('totally unmapped wording')).toBe('OTHER');
  });

  it('uses the keyword rule when one matches', () => {
    expect(defaultReasonClassifier('Sterility failure')).toBe('STERILITY');
  });
});
