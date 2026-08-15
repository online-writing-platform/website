import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div>
      <button onClick={() => changeLanguage("fa")}>فارسی</button>

      <button onClick={() => changeLanguage("en")}>English</button>
    </div>
  );
}
