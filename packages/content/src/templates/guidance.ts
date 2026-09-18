import type { GuidanceKey } from '../keys';
import type { ContentTemplate } from '../types';

const REVIEWED_AT_EN = '2026-09-17T00:00:00.000Z';
const REVIEWED_BY_EN = 'lane-I (docs/SAFETY_AND_CONTENT.md source of truth)';

/** docs/SAFETY_AND_CONTENT.md "What to do next" (FLAGGED and VERIFY) - reviewed English. */
const WHAT_TO_DO_NEXT_EN = [
  "Don't stop taking a prescribed medicine on your own. Talk to your doctor first.",
  'Keep the strip, carton and bill.',
  'Show this screen to your pharmacist and ask for a replacement from a different batch.',
  'If you notice any side effect or problem, you can report it.',
];

const WHAT_TO_DO_NEXT_HI = [
  'अपने डॉक्टर से बात किए बिना कोई भी डॉक्टर की बताई दवा लेना बंद न करें। पहले अपने डॉक्टर से बात करें।',
  'स्ट्रिप, डिब्बा और बिल संभाल कर रखें।',
  'यह स्क्रीन अपने फार्मासिस्ट को दिखाएं और किसी दूसरे बैच का रिप्लेसमेंट मांगें।',
  'अगर आपको कोई साइड इफेक्ट या समस्या दिखे, तो आप उसकी रिपोर्ट कर सकते हैं।',
];

const WHAT_TO_DO_NEXT_KN = [
  'ವೈದ್ಯರ ಸಲಹೆ ಇಲ್ಲದೆ ಸೂಚಿಸಿದ ಔಷಧಿಯನ್ನು ತೆಗೆದುಕೊಳ್ಳುವುದನ್ನು ನಿಲ್ಲಿಸಬೇಡಿ. ಮೊದಲು ನಿಮ್ಮ ವೈದ್ಯರೊಂದಿಗೆ ಮಾತನಾಡಿ.',
  'ಸ್ಟ್ರಿಪ್, ಕಾರ್ಟನ್ ಮತ್ತು ಬಿಲ್ ಅನ್ನು ಇಟ್ಟುಕೊಳ್ಳಿ.',
  'ಈ ಸ್ಕ್ರೀನ್ ಅನ್ನು ನಿಮ್ಮ ಫಾರ್ಮಾಸಿಸ್ಟ್‌ಗೆ ತೋರಿಸಿ ಮತ್ತು ಬೇರೆ ಬ್ಯಾಚ್‌ನ ಬದಲಿಗಾಗಿ ಕೇಳಿ.',
  'ಯಾವುದೇ ಅಡ್ಡಪರಿಣಾಮ ಅಥವಾ ಸಮಸ್ಯೆ ಕಂಡುಬಂದರೆ, ನೀವು ಅದನ್ನು ವರದಿ ಮಾಡಬಹುದು.',
];

function en(key: GuidanceKey, title: string, body: string, placeholders: string[], steps: string[]): ContentTemplate {
  return { key, lang: 'en', title, body, steps, placeholders, reviewedBy: REVIEWED_BY_EN, reviewedAt: REVIEWED_AT_EN };
}

function draft(key: GuidanceKey, lang: 'hi' | 'kn', title: string, body: string, placeholders: string[], steps: string[]): ContentTemplate {
  // Hand-drafted, not yet run through scripts/content/translate.ts + native review - see
  // scripts/content/review.md. reviewedBy/reviewedAt stay unset so render() treats this as a draft.
  return { key, lang, title, body, steps, placeholders };
}

const VERIFY_TITLE_EN = 'Please check this batch with your pharmacist';
const VERIFY_TITLE_HI = 'कृपया इस बैच की जांच अपने फार्मासिस्ट से करवाएं';
const VERIFY_TITLE_KN = 'ದಯವಿಟ್ಟು ಈ ಬ್ಯಾಚ್ ಅನ್ನು ನಿಮ್ಮ ಫಾರ್ಮಾಸಿಸ್ಟ್‌ನೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ';

function verifyEn(key: GuidanceKey, mismatchPlain: string): ContentTemplate {
  return en(
    key,
    VERIFY_TITLE_EN,
    `This looks similar to a batch on a CDSCO alert list, but ${mismatchPlain}. Show this screen and the strip to your pharmacist.`,
    [],
    WHAT_TO_DO_NEXT_EN,
  );
}

function verifyHi(key: GuidanceKey, mismatchPlain: string): ContentTemplate {
  return draft(
    key,
    'hi',
    VERIFY_TITLE_HI,
    `यह CDSCO अलर्ट सूची के किसी बैच जैसा दिखता है, लेकिन ${mismatchPlain}। यह स्क्रीन और स्ट्रिप अपने फार्मासिस्ट को दिखाएं।`,
    [],
    WHAT_TO_DO_NEXT_HI,
  );
}

function verifyKn(key: GuidanceKey, mismatchPlain: string): ContentTemplate {
  return draft(
    key,
    'kn',
    VERIFY_TITLE_KN,
    `ಇದು CDSCO ಎಚ್ಚರಿಕೆ ಪಟ್ಟಿಯಲ್ಲಿರುವ ಬ್ಯಾಚ್‌ಗೆ ಹೋಲುತ್ತದೆ, ಆದರೆ ${mismatchPlain}. ಈ ಸ್ಕ್ರೀನ್ ಮತ್ತು ಸ್ಟ್ರಿಪ್ ಅನ್ನು ನಿಮ್ಮ ಫಾರ್ಮಾಸಿಸ್ಟ್‌ಗೆ ತೋರಿಸಿ.`,
    [],
    WHAT_TO_DO_NEXT_KN,
  );
}

/** All templates (en reviewed source of truth, hi/kn drafts) keyed by GuidanceKey then lang. */
export const GUIDANCE_TEMPLATES: Record<GuidanceKey, Partial<Record<'en' | 'hi' | 'kn', ContentTemplate>>> = {
  'result.flagged.nsq': {
    en: en(
      'result.flagged.nsq',
      'This batch is on a CDSCO alert list',
      'CDSCO reported batch {batch} of {product} as Not of Standard Quality in {alertMonth} ({reportingLab}). Reason: {reasonPlain}.',
      ['batch', 'product', 'alertMonth', 'reportingLab', 'reasonPlain'],
      WHAT_TO_DO_NEXT_EN,
    ),
    hi: draft(
      'result.flagged.nsq',
      'hi',
      'यह बैच CDSCO अलर्ट सूची में है',
      'CDSCO ने {alertMonth} में {product} के बैच {batch} को मानक गुणवत्ता का नहीं (Not of Standard Quality) बताया ({reportingLab})। कारण: {reasonPlain}।',
      ['batch', 'product', 'alertMonth', 'reportingLab', 'reasonPlain'],
      WHAT_TO_DO_NEXT_HI,
    ),
    kn: draft(
      'result.flagged.nsq',
      'kn',
      'ಈ ಬ್ಯಾಚ್ CDSCO ಎಚ್ಚರಿಕೆ ಪಟ್ಟಿಯಲ್ಲಿದೆ',
      'CDSCO {alertMonth} ನಲ್ಲಿ {product} ಯ ಬ್ಯಾಚ್ {batch} ಅನ್ನು ಗುಣಮಟ್ಟದ ಮಾನದಂಡಕ್ಕೆ ಅನುಗುಣವಾಗಿಲ್ಲ (Not of Standard Quality) ಎಂದು ವರದಿ ಮಾಡಿದೆ ({reportingLab}). ಕಾರಣ: {reasonPlain}.',
      ['batch', 'product', 'alertMonth', 'reportingLab', 'reasonPlain'],
      WHAT_TO_DO_NEXT_KN,
    ),
  },
  'result.flagged.spurious': {
    en: en(
      'result.flagged.spurious',
      'A batch with this label was reported as spurious',
      'CDSCO reported a batch carrying batch number {batch} and the label of {manufacturer} as spurious in {alertMonth}. The real manufacturer may not have made it.',
      ['batch', 'manufacturer', 'alertMonth'],
      WHAT_TO_DO_NEXT_EN,
    ),
    hi: draft(
      'result.flagged.spurious',
      'hi',
      'इस लेबल वाला एक बैच स्पूरियस के रूप में रिपोर्ट किया गया',
      'CDSCO ने {alertMonth} में बैच नंबर {batch} और {manufacturer} के लेबल वाले एक बैच को स्पूरियस के रूप में रिपोर्ट किया। हो सकता है असली निर्माता ने इसे न बनाया हो।',
      ['batch', 'manufacturer', 'alertMonth'],
      WHAT_TO_DO_NEXT_HI,
    ),
    kn: draft(
      'result.flagged.spurious',
      'kn',
      'ಈ ಲೇಬಲ್ ಹೊಂದಿರುವ ಬ್ಯಾಚ್ ಸ್ಪೂರಿಯಸ್ ಎಂದು ವರದಿಯಾಗಿದೆ',
      'CDSCO {alertMonth} ನಲ್ಲಿ ಬ್ಯಾಚ್ ಸಂಖ್ಯೆ {batch} ಮತ್ತು {manufacturer} ಲೇಬಲ್ ಹೊಂದಿರುವ ಬ್ಯಾಚ್ ಅನ್ನು ಸ್ಪೂರಿಯಸ್ ಎಂದು ವರದಿ ಮಾಡಿದೆ. ನಿಜವಾದ ತಯಾರಕರು ಇದನ್ನು ತಯಾರಿಸಿಲ್ಲದಿರಬಹುದು.',
      ['batch', 'manufacturer', 'alertMonth'],
      WHAT_TO_DO_NEXT_KN,
    ),
  },
  'result.verify.near_batch': {
    en: verifyEn('result.verify.near_batch', 'the batch number is close but not an exact match'),
    hi: verifyHi('result.verify.near_batch', 'बैच नंबर लगभग मेल खाता है पर पूरी तरह एक जैसा नहीं है'),
    kn: verifyKn('result.verify.near_batch', 'ಬ್ಯಾಚ್ ಸಂಖ್ಯೆ ಹತ್ತಿರವಿದೆ ಆದರೆ ನಿಖರವಾಗಿ ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ'),
  },
  'result.verify.manufacturer_unknown': {
    en: verifyEn('result.verify.manufacturer_unknown', "we don't know the manufacturer of this batch"),
    hi: verifyHi('result.verify.manufacturer_unknown', 'हमें इस बैच के निर्माता की जानकारी नहीं है'),
    kn: verifyKn('result.verify.manufacturer_unknown', 'ಈ ಬ್ಯಾಚ್‌ನ ತಯಾರಕರು ಯಾರೆಂದು ನಮಗೆ ತಿಳಿದಿಲ್ಲ'),
  },
  'result.verify.low_read_confidence': {
    en: verifyEn('result.verify.low_read_confidence', "we're not fully sure we read the batch number correctly"),
    hi: verifyHi('result.verify.low_read_confidence', 'हमें पूरा यकीन नहीं है कि बैच नंबर सही पढ़ा गया है'),
    kn: verifyKn('result.verify.low_read_confidence', 'ಬ್ಯಾಚ್ ಸಂಖ್ಯೆಯನ್ನು ಸರಿಯಾಗಿ ಓದಿದ್ದೇವೆಯೇ ಎಂದು ನಮಗೆ ಸಂಪೂರ್ಣ ಖಚಿತವಿಲ್ಲ'),
  },
  'result.verify.default': {
    en: verifyEn('result.verify.default', 'some details do not fully match'),
    hi: verifyHi('result.verify.default', 'कुछ विवरण पूरी तरह मेल नहीं खाते'),
    kn: verifyKn('result.verify.default', 'ಕೆಲವು ವಿವರಗಳು ಸಂಪೂರ್ಣವಾಗಿ ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ'),
  },
  'result.no_alert_found': {
    en: en(
      'result.no_alert_found',
      'No alert found for this batch',
      "We checked {monthCount} CDSCO lists up to {latestMonth}. This does not certify {product}; it means this batch is not on those lists. We'll keep checking every month if you save it.",
      ['monthCount', 'latestMonth', 'product'],
      [],
    ),
    hi: draft(
      'result.no_alert_found',
      'hi',
      'इस बैच के लिए कोई अलर्ट नहीं मिला',
      'हमने {latestMonth} तक {monthCount} CDSCO सूचियां जांचीं। यह {product} को प्रमाणित नहीं करता; इसका मतलब है कि यह बैच उन सूचियों में नहीं है। अगर आप इसे सेव करेंगे, तो हम हर महीने जांचते रहेंगे।',
      ['monthCount', 'latestMonth', 'product'],
      [],
    ),
    kn: draft(
      'result.no_alert_found',
      'kn',
      'ಈ ಬ್ಯಾಚ್‌ಗೆ ಯಾವುದೇ ಎಚ್ಚರಿಕೆ ಕಂಡುಬಂದಿಲ್ಲ',
      'ನಾವು {latestMonth} ವರೆಗೆ {monthCount} CDSCO ಪಟ್ಟಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿದ್ದೇವೆ. ಇದು {product} ಅನ್ನು ಪ್ರಮಾಣೀಕರಿಸುವುದಿಲ್ಲ; ಇದರರ್ಥ ಈ ಬ್ಯಾಚ್ ಆ ಪಟ್ಟಿಗಳಲ್ಲಿ ಇಲ್ಲ. ನೀವು ಇದನ್ನು ಉಳಿಸಿದರೆ ನಾವು ಪ್ರತಿ ತಿಂಗಳು ಪರಿಶೀಲಿಸುತ್ತಲೇ ಇರುತ್ತೇವೆ.',
      ['monthCount', 'latestMonth', 'product'],
      [],
    ),
  },
};
