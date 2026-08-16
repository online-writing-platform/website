import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage?.startsWith("en") ? "en" : "fa";
  const nextLanguage = currentLanguage === "fa" ? "en" : "fa";

  function changeLanguage(): void {
    void i18n.changeLanguage(nextLanguage);
  }

  return (
    <button
      type="button"
      className="platform-language-button"
      onClick={changeLanguage}
      aria-label={t(`language.switchTo.${nextLanguage}`)}
      title={t(`language.switchTo.${nextLanguage}`)}
    >
      <Globe className="platform-account-icon" aria-hidden="true" />
      <span>{currentLanguage.toUpperCase()}</span>
    </button>
  );
}
