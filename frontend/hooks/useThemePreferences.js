import { useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "../constants/finance.js";

export default function useThemePreferences() {
    const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEYS.theme) || "system");
    const [resolvedTheme, setResolvedTheme] = useState(() => {
        const preference = localStorage.getItem(STORAGE_KEYS.theme) || "system";
        return preference === "system"
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : preference;
    });
    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const appearanceRef = useRef(null);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.theme, theme);
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const updateTheme = () => {
            const nextTheme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
            document.body.dataset.theme = nextTheme;
            setResolvedTheme(nextTheme);
        };
        updateTheme();
        if (theme !== "system") return undefined;
        media.addEventListener("change", updateTheme);
        return () => media.removeEventListener("change", updateTheme);
    }, [theme]);

    useEffect(() => {
        const closeAppearance = event => {
            if (event.type === "keydown" && event.key === "Escape") setAppearanceOpen(false);
            if (event.type === "click" && !appearanceRef.current?.contains(event.target)) setAppearanceOpen(false);
        };
        document.addEventListener("click", closeAppearance);
        document.addEventListener("keydown", closeAppearance);
        return () => {
            document.removeEventListener("click", closeAppearance);
            document.removeEventListener("keydown", closeAppearance);
        };
    }, []);

    return { theme, setTheme, resolvedTheme, appearanceOpen, setAppearanceOpen, appearanceRef };
}
