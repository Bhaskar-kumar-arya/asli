/**
 * Shell/chrome strings only. Result-card and guidance copy is reviewed
 * content owned by lane I (packages/content) and lane D2 (features/scan),
 * fetched per docs/API.md GET /v1/content/guidance/{key}.
 */
export const resources = {
  en: {
    translation: {
      appName: 'Asli',
      home: 'Home',
      checkAMedicine: 'Check a medicine',
      settings: 'Settings',
      language: 'Language',
      textSize: 'Text size',
      notifications: 'Notifications',
      signOut: 'Sign out',
    },
  },
  hi: {
    translation: {
      appName: 'Asli',
      home: 'होम',
      checkAMedicine: 'दवा जाँचें',
      settings: 'सेटिंग्स',
      language: 'भाषा',
      textSize: 'अक्षर का आकार',
      notifications: 'सूचनाएं',
      signOut: 'साइन आउट',
    },
  },
  kn: {
    translation: {
      appName: 'Asli',
      home: 'ಮುಖಪುಟ',
      checkAMedicine: 'ಔಷಧಿ ಪರಿಶೀಲಿಸಿ',
      settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      language: 'ಭಾಷೆ',
      textSize: 'ಅಕ್ಷರ ಗಾತ್ರ',
      notifications: 'ಅಧಿಸೂಚನೆಗಳು',
      signOut: 'ಸೈನ್ ಔಟ್',
    },
  },
} as const;

export type SupportedLanguage = keyof typeof resources;
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'hi', 'kn'];
