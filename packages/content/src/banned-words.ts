import type { ContentLang } from './keys';

/**
 * docs/SAFETY_AND_CONTENT.md wording rules, enforced at render time - CLAUDE.md rule 2
 * ("never say safe") and rule 5 (never advise stopping a medicine) are non-negotiable, so
 * every rendered template is checked in every language before it ships or is sent.
 *
 * Hindi/Kannada patterns are drafted here, same caveat as reasons.ts: Amazon Translate is
 * blocked on this AWS account (plan/tasks/T01-spikes.md spike 7), so these are hand-drafted
 * and need the native-speaker reviewer (scripts/content/review.md) to confirm or extend them.
 */
const BANNED_PATTERNS: Record<ContentLang, RegExp[]> = {
  en: [
    /\bsafe\b/i,
    /\bgenuine\b/i,
    /\bverified\b/i,
    /\bunsafe\b/i,
    /\bfake\b/i,
    // "Don't/do not stop taking..." is the reviewed safety instruction (rule 5) - only ban
    // "stop taking" when it isn't qualified by that negation, e.g. generated advice to stop.
    /(?<!don't )(?<!do not )\bstop taking\b/i,
    /we detected/i,
    /is bad\b/i,
  ],
  hi: [
    /सुरक्षित/, // safe
    /सत्यापित/, // verified
    /नकली/, // fake - reviewed content says "स्पूरियस" (spurious), never "नकली"
    /असली(?! निर्माता)/, // genuine/real (allow "असली निर्माता" - reviewed "the real manufacturer" wording)
    /लेना बंद(?! न करें)/, // "stop taking" unqualified (allow "...लेना बंद न करें" - reviewed "don't stop taking")
    /हमने पाया/, // "we detected"
  ],
  kn: [
    /ಸುರಕ್ಷಿತ/, // safe
    /ಪರಿಶೀಲಿಸಲಾಗಿದೆ/, // verified
    /ನಕಲಿ/, // fake - reviewed content says "ಸ್ಪೂರಿಯಸ್" (spurious), never "ನಕಲಿ"
    /ನಿಜವಾದ(?! ತಯಾರಕ)/, // genuine/real (allow "ನಿಜವಾದ ತಯಾರಕ" - reviewed "the real manufacturer" wording)
    /ತೆಗೆದುಕೊಳ್ಳುವುದನ್ನು ನಿಲ್ಲಿಸಿ/, // "stop taking" unqualified
  ],
};

export function findBannedWording(text: string, lang: ContentLang = 'en'): string[] {
  return BANNED_PATTERNS[lang].filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

/** Throws if `text` contains any banned wording in `lang`. Call on every rendered template before it ships or sends. */
export function assertNoBannedWording(text: string, lang: ContentLang = 'en'): void {
  const hits = findBannedWording(text, lang);
  if (hits.length > 0) {
    throw new Error(`Banned wording found (${hits.join(', ')}) in [${lang}]: ${text}`);
  }
}
