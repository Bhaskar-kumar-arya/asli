import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, SUPPORTED_LANGUAGES, type SupportedLanguage } from './resources';

const STORAGE_KEY = 'asli.language';

function getStoredLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LANGUAGES as string[]).includes(stored)) return stored as SupportedLanguage;
  } catch {
    /* ignore */
  }
  return 'en';
}

void i18next.use(initReactI18next).init({
  resources,
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: SupportedLanguage): void {
  void i18next.changeLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

export { i18next };
export * from './resources';
