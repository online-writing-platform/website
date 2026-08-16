import { useTheme } from "../context/theme";
import { FiMoon, FiSun } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import "./ThemeButton.css";

function ThemeButton() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-button"
      type="button"
      onClick={toggleTheme}
      aria-label={t("PlatformHeader.toggleTheme")}
    >
      {theme === "light" ? (
        <FiMoon className="moon" />
      ) : (
        <FiSun className="sun" />
      )}
    </button>
  );
}

export default ThemeButton;
