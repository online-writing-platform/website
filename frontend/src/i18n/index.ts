import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import fa from "./locales/fa/translation.json";
import en from "./locales/en/translation.json";

const supportedLanguages = ["fa", "en"] as const;

function normalizeLanguage(
  language?: string,
): (typeof supportedLanguages)[number] {
  return language?.toLowerCase().startsWith("en") ? "en" : "fa";
}

function syncDocumentLanguage(language?: string): void {
  const normalizedLanguage = normalizeLanguage(language);

  document.documentElement.lang = normalizedLanguage;
  document.documentElement.dir = normalizedLanguage === "fa" ? "rtl" : "ltr";
}
i18n.on("languageChanged", syncDocumentLanguage);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fa: {
        translation: fa,
      },
      en: {
        translation: en,
      },
    },

    fallbackLng: "fa",
    supportedLngs: supportedLanguages,
    load: "languageOnly",

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "platform-language",
    },
    interpolation: {
      escapeValue: false,
    },
  })
  .then(() => syncDocumentLanguage(i18n.resolvedLanguage));

export default i18n;
