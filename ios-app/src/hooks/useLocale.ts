import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage, isSpanish } from '../i18n';

export interface UseLocaleReturn {
  t: (key: string, options?: any) => string;
  locale: string;
  setLocale: (language: string) => Promise<void>;
  isSpanish: boolean;
}

export const useLocale = (): UseLocaleReturn => {
  try {
    const { t, ready } = useTranslation();

    const setLocale = async (language: string) => {
      try {
        await changeLanguage(language);
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to change language:', error);
        }
      }
    };

    // Provide fallback if i18n is not ready
    const safeT = (key: string, options?: any) => {
      try {
        if (!ready) {
          return key; // Return the key as fallback
        }
        return t(key, options);
      } catch (error) {
        if (__DEV__) {
          console.warn('Translation error:', error);
        }
        return key;
      }
    };

    return {
      t: safeT,
      locale: getCurrentLanguage(),
      setLocale,
      isSpanish: isSpanish(),
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('useLocale hook initialization failed, using fallbacks:', error);
    }

    // Complete fallback implementation
    return {
      t: (key: string) => key,
      locale: 'en-US',
      setLocale: async () => {},
      isSpanish: false,
    };
  }
};