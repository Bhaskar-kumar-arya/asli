import type { ContentLang } from './keys';

/**
 * Reviewed UI strings that sit next to guidance copy on the result card (docs/UX.md screen 6) -
 * in scope for lane I because they're part of the safety-reviewed surface, unlike shell chrome
 * strings (home, settings, ...) which D1 owns in apps/web/src/i18n/resources.ts.
 */
export const UI_STRINGS: Record<ContentLang, Record<string, string>> = {
  en: {
    readAloud: 'Read aloud',
    reading: 'Reading…',
    saveToFamilyMedicines: 'Save to family medicines',
    whatToDoNext: 'What to do next',
    viewCdscoSource: 'View CDSCO source',
    sourceAttribution: 'Source: CDSCO, {lab}.',
    demoReplayLabel: 'Demo replay of a real {month} CDSCO alert',
  },
  hi: {
    readAloud: 'ज़ोर से पढ़ें',
    reading: 'पढ़ रहे हैं…',
    saveToFamilyMedicines: 'परिवार की दवाओं में सेव करें',
    whatToDoNext: 'आगे क्या करें',
    viewCdscoSource: 'CDSCO स्रोत देखें',
    sourceAttribution: 'स्रोत: CDSCO, {lab}।',
    demoReplayLabel: '{month} के वास्तविक CDSCO अलर्ट का डेमो रीप्ले',
  },
  kn: {
    readAloud: 'ಗಟ್ಟಿಯಾಗಿ ಓದಿ',
    reading: 'ಓದುತ್ತಿದೆ…',
    saveToFamilyMedicines: 'ಕುಟುಂಬದ ಔಷಧಿಗಳಿಗೆ ಉಳಿಸಿ',
    whatToDoNext: 'ಮುಂದೆ ಏನು ಮಾಡಬೇಕು',
    viewCdscoSource: 'CDSCO ಮೂಲವನ್ನು ವೀಕ್ಷಿಸಿ',
    sourceAttribution: 'ಮೂಲ: CDSCO, {lab}.',
    demoReplayLabel: '{month} ನ ನೈಜ CDSCO ಎಚ್ಚರಿಕೆಯ ಡೆಮೊ ಮರುಪ್ಲೇ',
  },
};

/** hi/kn are hand-drafted, unreviewed (see scripts/content/review.md) - only `en` is reviewed. */
export const UI_STRINGS_REVIEWED: Record<ContentLang, boolean> = { en: true, hi: false, kn: false };

export function uiString(id: string, lang: ContentLang, vars: Record<string, string> = {}): string {
  const raw = UI_STRINGS[lang]?.[id] ?? UI_STRINGS.en[id];
  if (raw === undefined) throw new Error(`Unknown UI string: ${id}`);
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}
