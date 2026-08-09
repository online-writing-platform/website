import { useEffect, useState, type ReactNode } from "react";

import { ThemeContext, type Theme } from "./theme";

interface ThemeProviderProps {
  children: ReactNode;
}

function initialTheme(): Theme {
  const stored = window.localStorage.getItem("platform-theme");
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function toggleTheme(): void {
    setTheme((previousTheme) =>
      previousTheme === "light" ? "dark" : "light",
    );
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("platform-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
