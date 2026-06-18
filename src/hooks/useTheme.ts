// ============================================================
//  Theme hook — manages dark/light mode
//  Adapted from HajimariUI theme switching
// ============================================================

import { useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "auto";

/**
 * Apply theme to document element
 */
function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);
}

/**
 * Hook to manage theme state
 */
export function useTheme(
  theme: Theme,
  onThemeChange?: (theme: Theme) => void
) {
  // Apply on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);

    // Listen for system preference changes if auto
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme(theme);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  // Toggle between light/dark, skipping auto
  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    onThemeChange?.(next);
  }, [theme, onThemeChange]);

  return { toggle, apply: applyTheme };
}
