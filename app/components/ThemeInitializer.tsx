"use client";
import { useEffect } from "react";

export default function ThemeInitializer() {
  useEffect(() => {
    const root = document.documentElement;
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;

    const applyTheme = (theme: "light" | "dark") => {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
      root.style.colorScheme = theme;
    };

    if (saved) {
      applyTheme(saved);
      return;
    }

    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }, []);

  return null;
}
