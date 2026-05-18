import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';

export async function initI18n(language) {
  await i18n.use(initReactI18next).init({
    resources: {
      'pt-BR': { translation: ptBR },
      en: { translation: en }
    },
    lng: language || 'pt-BR',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

  if (window.devlog?.i18n?.onLanguageChange) {
    window.devlog.i18n.onLanguageChange((lng) => {
      if (lng && lng !== i18n.language) i18n.changeLanguage(lng);
    });
  }

  return i18n;
}

export default i18n;
