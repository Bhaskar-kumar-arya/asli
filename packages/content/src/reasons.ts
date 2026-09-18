import type { ReasonCode } from '@asli/contracts';
import type { ContentLang } from './keys';

const REVIEWED_AT_EN = '2026-09-17T00:00:00.000Z';

/** docs/SAFETY_AND_CONTENT.md "Reason codes and plain-language text" table - reviewed English, source of truth. */
export const REASON_PLAIN_TEXT_EN: Record<ReasonCode, string> = {
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

/**
 * Amazon Translate drafts (scripts/content/translate.ts would normally produce these - blocked
 * on this AWS account per plan/tasks/T01-spikes.md spike 7, so these are hand-drafted from the
 * reviewed English above). Unreviewed: no native speaker has confirmed them yet, see
 * scripts/content/review.md. `render()` falls back to English for any code without a reviewed
 * draft in the target language.
 */
export const REASON_PLAIN_TEXT_HI: Partial<Record<ReasonCode, string>> = {
  DISSOLUTION: 'गोली शरीर में ठीक से घुल नहीं सकती।',
  ASSAY: 'दवा की मात्रा तय सीमा से बाहर थी।',
  IDENTIFICATION: 'जांच यह पुष्टि नहीं कर सकी कि अपेक्षित दवा मौजूद है।',
  DISINTEGRATION: 'गोली तय समय में नहीं टूटी।',
  STERILITY: 'स्टेराइल उत्पाद स्टेरिलिटी जांच में विफल रहा।',
  PARTICULATE: 'अवांछित कण पाए गए।',
  MICROBIAL: 'माइक्रोबियल सीमाएं पूरी नहीं हुईं।',
  RELATED_SUBSTANCES: 'अशुद्धियां तय सीमा से अधिक थीं।',
  PH: 'अम्लता या क्षारीयता तय सीमा से बाहर थी।',
  DESCRIPTION: 'उत्पाद का रूप उसकी तय विशेषताओं से मेल नहीं खाता था।',
  UNIFORMITY: 'हर इकाई में दवा की मात्रा एक समान नहीं थी।',
  LABELLING: 'लेबलिंग तय आवश्यकताओं को पूरा नहीं करती थी।',
  SPURIOUS: 'स्पूरियस के रूप में रिपोर्ट किया गया (लेबल पर लिखे निर्माता ने नहीं बनाया)।', // spurious - reported
  OTHER: 'एक या अधिक गुणवत्ता जांच में विफल रहा। विवरण के लिए CDSCO स्रोत देखें।',
};

export const REASON_PLAIN_TEXT_KN: Partial<Record<ReasonCode, string>> = {
  DISSOLUTION: 'ಮಾತ್ರೆ ದೇಹದಲ್ಲಿ ಸರಿಯಾಗಿ ಕರಗದೆ ಇರಬಹುದು.',
  ASSAY: 'ಔಷಧಿಯ ಪ್ರಮಾಣ ಅನುಮತಿಸಿದ ಮಿತಿಯ ಹೊರಗಿತ್ತು.',
  IDENTIFICATION: 'ನಿರೀಕ್ಷಿತ ಔಷಧಿ ಇರುವುದನ್ನು ಪರೀಕ್ಷೆ ದೃಢಪಡಿಸಲಿಲ್ಲ.',
  DISINTEGRATION: 'ಮಾತ್ರೆ ನಿಗದಿತ ಸಮಯದಲ್ಲಿ ಒಡೆಯಲಿಲ್ಲ.',
  STERILITY: 'ಸ್ಟೆರೈಲ್ ಉತ್ಪನ್ನ ಸ್ಟೆರಿಲಿಟಿ ಪರೀಕ್ಷೆಯಲ್ಲಿ ವಿಫಲವಾಯಿತು.',
  PARTICULATE: 'ಅನಪೇಕ್ಷಿತ ಕಣಗಳು ಕಂಡುಬಂದಿವೆ.',
  MICROBIAL: 'ಸೂಕ್ಷ್ಮಜೀವಿ ಮಿತಿಗಳನ್ನು ಪೂರೈಸಲಾಗಿಲ್ಲ.',
  RELATED_SUBSTANCES: 'ಅಶುದ್ಧಿಗಳು ಅನುಮತಿಸಿದ ಮಿತಿಗಿಂತ ಹೆಚ್ಚಿದ್ದವು.',
  PH: 'ಆಮ್ಲೀಯತೆ ಅಥವಾ ಕ್ಷಾರೀಯತೆ ಅನುಮತಿಸಿದ ವ್ಯಾಪ್ತಿಯ ಹೊರಗಿತ್ತು.',
  DESCRIPTION: 'ಉತ್ಪನ್ನದ ನೋಟ ಅದರ ವಿಶೇಷಣಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ.',
  UNIFORMITY: 'ಪ್ರತಿ ಘಟಕದಲ್ಲಿ ಡೋಸ್ ಏಕರೂಪವಾಗಿರಲಿಲ್ಲ.',
  LABELLING: 'ಲೇಬಲಿಂಗ್ ಅಗತ್ಯತೆಗಳನ್ನು ಪೂರೈಸಲಿಲ್ಲ.',
  SPURIOUS: 'ಸ್ಪೂರಿಯಸ್ ಎಂದು ವರದಿಯಾಗಿದೆ (ಲೇಬಲ್‌ನಲ್ಲಿರುವ ತಯಾರಕರು ಇದನ್ನು ತಯಾರಿಸಿಲ್ಲ).',
  OTHER: 'ಒಂದು ಅಥವಾ ಹೆಚ್ಚು ಗುಣಮಟ್ಟ ಪರೀಕ್ಷೆಗಳಲ್ಲಿ ವಿಫಲವಾಗಿದೆ. ವಿವರಗಳಿಗಾಗಿ CDSCO ಮೂಲವನ್ನು ನೋಡಿ.',
};

const BY_LANG: Record<ContentLang, Partial<Record<ReasonCode, string>>> = {
  en: REASON_PLAIN_TEXT_EN,
  hi: REASON_PLAIN_TEXT_HI,
  kn: REASON_PLAIN_TEXT_KN,
};

/** Reviewed-only lookup - `reasonPlainText` below is the one callers should use (it falls back to en). */
export const REASON_REVIEWED_AT: Record<ContentLang, string | undefined> = {
  en: REVIEWED_AT_EN,
  hi: undefined,
  kn: undefined,
};

/** Plain-language reason text for a reason code, falling back to English when `lang` has no reviewed draft. */
export function reasonPlainText(code: ReasonCode, lang: ContentLang): string {
  return BY_LANG[lang][code] ?? REASON_PLAIN_TEXT_EN[code];
}
