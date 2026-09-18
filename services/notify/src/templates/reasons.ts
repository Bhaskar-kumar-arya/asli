import type { ReasonCode } from '@asli/contracts';

/** docs/SAFETY_AND_CONTENT.md "Reason codes and plain-language text" table. */
export const REASON_PLAIN_TEXT: Record<ReasonCode, string> = {
  DISSOLUTION: 'The tablet may not release its medicine properly in the body.',
  ASSAY: 'The amount of active medicine was outside the allowed limit.',
  IDENTIFICATION: 'The test could not confirm the expected medicine is present.',
  DISINTEGRATION: 'The tablet did not break down in the expected time.',
  STERILITY: 'The sterile product failed a sterility test.',
  PARTICULATE: 'Unwanted particles were found.',
  MICROBIAL: 'Microbial limits were not met.',
  RELATED_SUBSTANCES: 'Impurities were above the allowed limit.',
  PH: 'The acidity or alkalinity was outside the allowed range.',
  DESCRIPTION: "The product's appearance did not match its specification.",
  UNIFORMITY: 'Doses were not consistent from unit to unit.',
  LABELLING: 'The labelling did not meet requirements.',
  SPURIOUS: 'Reported as spurious (not made by the manufacturer on the label).',
  OTHER: 'Failed one or more quality tests. See the CDSCO source for details.',
};
