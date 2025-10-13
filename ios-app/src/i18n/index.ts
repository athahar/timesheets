import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations - use dynamic imports for better error handling
let enUS: any = {};
let esUS: any = {};
try {
  enUS = require('./resources/en-US.json');
  esUS = require('./resources/es-US.json');
} catch (error) {
  if (__DEV__) {
    if (__DEV__) console.warn('Translation files not found, using fallback', error);
  }
}

const LANGUAGE_STORAGE_KEY = 'user_language';

// Missing key dev logger (Apple compliant - only in dev mode)
const missingKeyHandler = (lng: string[], ns: string, key: string) => {
  if (__DEV__) {
    if (__DEV__) console.warn(`🌐 Missing translation key: ${key} for language: ${lng[0]}`);
  }
  return key; // Fallback to key itself
};

// Initialize i18next
const initI18n = async () => {
  let savedLanguage: string | null = null;

  try {
    savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    if (__DEV__) {
      console.error('Error reading saved language:', error);
    }
  }

  // Language detection priority:
  // 1. Saved language preference
  // 2. Device locale (if starts with 'es' → Spanish)
  // 3. Default to English
  let initialLanguage = 'en-US';

  if (savedLanguage) {
    initialLanguage = savedLanguage;
  } else {
    try {
      // Use dynamic import for better error handling
      const Localization = require('expo-localization');
      const deviceLocale = Localization?.locale || 'en-US';
      if (typeof deviceLocale === 'string' && deviceLocale.startsWith('es')) {
        initialLanguage = 'es-US';
      }
    } catch (error) {
      if (__DEV__) {
        if (__DEV__) console.warn('Expo Localization not available, using default language', error);
      }
    }
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        'en-US': {
          translation: enUS,
        },
        'es-US': {
          translation: esUS,
        },
      },
      lng: initialLanguage,
      fallbackLng: 'en-US',
      debug: false, // Never enable in production

      interpolation: {
        escapeValue: false, // React already escapes
      },

      // Handle missing keys
      saveMissing: __DEV__, // Only in dev mode
      missingKeyHandler: __DEV__ ? missingKeyHandler : undefined,

      // Use ICU message format for variables
      compatibilityJSON: 'v3',
    });

  if (__DEV__) {
    if (__DEV__) console.log(`🌐 i18n initialized with language: ${initialLanguage}`);
  }

  return i18n;
};

// Change language and persist
export const changeLanguage = async (language: string) => {
  try {
    await i18n.changeLanguage(language);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);

    if (__DEV__) {
      if (__DEV__) console.log(`🌐 Language changed to: ${language}`);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('Error changing language:', error);
    }
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  try {
    return i18n.language || 'en-US';
  } catch (error) {
    if (__DEV__) {
      if (__DEV__) console.warn('i18n not initialized yet, using default language');
    }
    return 'en-US';
  }
};

// Check if current language is Spanish
export const isSpanish = (): boolean => {
  try {
    return getCurrentLanguage() === 'es-US';
  } catch (error) {
    return false;
  }
};

export { initI18n };
export default i18n;