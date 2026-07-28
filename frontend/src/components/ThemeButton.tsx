import { useTheme } from "../context/ThemeContext";

function ThemeButton() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button type="button" onClick={toggleTheme} aria-label="تغییر پوسته">
            {theme === "light" ? "🌙" : "☀️"}
        </button>
    );
}

export default ThemeButton;
