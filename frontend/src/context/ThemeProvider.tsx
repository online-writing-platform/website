import { useEffect, useState, type ReactNode } from "react";

import { ThemeContext, type Theme } from "./theme";

interface ThemeProviderProps {
    children: ReactNode;
}

function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>("light");

    function toggleTheme(): void {
        setTheme((previousTheme) =>
            previousTheme === "light" ? "dark" : "light",
        );
    }

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
    }, [theme]);

    return (
        <ThemeContext.Provider
            value={{
                theme,
                toggleTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export default ThemeProvider;
