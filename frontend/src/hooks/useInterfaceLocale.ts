import { useTranslation } from "react-i18next";

export type InterfaceLanguage = "fa" | "en";

export default function useInterfaceLocale() {
  const { i18n } = useTranslation();
  const language: InterfaceLanguage = i18n.resolvedLanguage
    ?.toLowerCase()
    .startsWith("en")
    ? "en"
    : "fa";

  return {
    language,
    direction: language === "fa" ? ("rtl" as const) : ("ltr" as const),
    locale: language === "fa" ? ("fa-IR" as const) : ("en-US" as const),
  };
}
