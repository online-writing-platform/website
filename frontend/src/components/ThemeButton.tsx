import { useTheme } from "../context/theme";
import { FiMoon, FiSun } from "react-icons/fi";
import "./ThemeButton.css";
function ThemeButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-button"
      type="button"
      onClick={toggleTheme}
      aria-label="تغییر پوسته"
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
