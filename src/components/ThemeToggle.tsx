// ============================================================
//  Theme Toggle — dark/light/system switch
//  Adapted from HajimariUI
// ============================================================

import React from "react";

interface ThemeToggleProps {
  theme: "light" | "dark" | "auto";
  onChange: (theme: "light" | "dark" | "auto") => void;
}

const themes = [
  { value: "light" as const, label: "\u2600", icon: "light_mode" },
  { value: "dark" as const, label: "\u263D", icon: "dark_mode" },
  { value: "auto" as const, label: "Auto", icon: "contrast" },
];

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <div className="flex gap-1 bg-secondary p-1 rounded-lg border border-border">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
            transition-all duration-150 cursor-pointer
            ${theme === t.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
            }
          `}
          title={t.label}
        >
          <span className="material-symbols-rounded text-base">{t.icon}</span>
        </button>
      ))}
    </div>
  );
}
