import type { CheckItemResult, MatchReasonCode, ReasonCode } from '@asli/contracts';

/**
 * Reviewed English copy from docs/SAFETY_AND_CONTENT.md "Result card copy".
 * This is a stand-in for packages/content (lane I) - a placeholder package
 * today. Swap to GET /v1/content/guidance/{guidanceKey}?lang= once I ships;
 * the guidanceKey on CheckItemResult already lines up with this map's keys.
 */
const REASON_PLAIN: Record<ReasonCode, string> = {
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

const MISMATCH_PLAIN: Partial<Record<MatchReasonCode, string>> = {
  BATCH_NEAR: 'the batch number is close but not an exact match',
  MFR_UNKNOWN: "we don't know the manufacturer of this batch",
  LOW_READ_CONFIDENCE: "we're not fully sure we read the batch number correctly",
};

const WHAT_TO_DO_NEXT = [
  "Don't stop taking a prescribed medicine on your own. Talk to your doctor first.",
  'Keep the strip, carton and bill.',
  'Show this screen to your pharmacist and ask for a replacement from a different batch.',
  'If you notice any side effect or problem, you can report it.',
];

function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-');
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export interface ResultCopy {
  title: string;
  body: string;
  whatToDoNext: string[];
}

export function getResultCopy(result: CheckItemResult): ResultCopy {
  const match = result.matches[0];
  const product = result.identity.productName ?? 'this product';

  if (result.tier === 'FLAGGED' && match?.category === 'SPURIOUS') {
    return {
      title: 'A batch with this label was reported as spurious',
      body: `CDSCO reported a batch carrying batch number ${match.batchRaw} and the label of ${match.manufacturerRaw} as spurious in ${monthLabel(match.alertMonth)}. The real manufacturer may not have made it.`,
      whatToDoNext: WHAT_TO_DO_NEXT,
    };
  }

  if (result.tier === 'FLAGGED' && match) {
    return {
      title: 'This batch is on a CDSCO alert list',
      body: `CDSCO reported batch ${match.batchRaw} of ${match.productName} as Not of Standard Quality in ${monthLabel(match.alertMonth)} (${match.reportingLab ?? match.reportingSource}). Reason: ${REASON_PLAIN[match.reasonCode]}`,
      whatToDoNext: WHAT_TO_DO_NEXT,
    };
  }

  if (result.tier === 'VERIFY') {
    const mismatchPlain =
      result.reasonCodes.map((code) => MISMATCH_PLAIN[code]).find(Boolean) ?? 'some details do not fully match';
    return {
      title: 'Please check this batch with your pharmacist',
      body: `This looks similar to a batch on a CDSCO alert list, but ${mismatchPlain}. Show this screen and the strip to your pharmacist.`,
      whatToDoNext: WHAT_TO_DO_NEXT,
    };
  }

  return {
    title: 'No alert found for this batch',
    body: `We checked ${result.checkedAgainst.monthCount} CDSCO lists up to ${monthLabel(result.checkedAgainst.latestMonth)}. This does not certify ${product}; it means this batch is not on those lists. We'll keep checking every month if you save it.`,
    whatToDoNext: [],
  };
}
