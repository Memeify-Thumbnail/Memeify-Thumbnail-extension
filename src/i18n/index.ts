// ============================================================
//  i18n — Simple client-side internationalization
// ============================================================

import type { TranslationKeys } from "./en";
import { en } from "./en";
import { zh } from "./zh";

const locales: Record<string, TranslationKeys> = {
  en,
  zh,
};

/**
 * Get a translation by dot-path key, with optional interpolation.
 *
 * Example:
 *   t("options.theme")                     → "Theme"
 *   t("options.imagesCount", { count: 5 }) → "5 images"
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
  locale?: string
): string {
  const lang = locale || getCurrentLocale();
  const dict = locales[lang] || locales["en"] || en;

  const keys = key.split(".");
  let value: unknown = dict;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // fallback to key
    }
  }

  if (typeof value !== "string") return key;

  // Interpolation
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, name) => {
      const val = params[name as keyof typeof params];
      return val !== undefined ? String(val) : `{${name}}`;
    });
  }

  return value;
}

/**
 * Get the currently active locale string
 */
export function getCurrentLocale(): string {
  // 优先从 localStorage 读取用户设置
  try {
    const stored = localStorage.getItem("memeify-locale");
    if (stored === "en") return "en";
    if (stored === "zh") return "zh";
  } catch {}
  // 未设置时默认 en
  return "en";
}

/**
 * Set locale
 */
export function setCurrentLocale(locale: string): void {
  localStorage.setItem("memeify-locale", locale);
}

/**
 * Reactive locale hook helper — returns [t, locale, setLocale]
 */
export function createI18n() {
  let currentLocale = getCurrentLocale();

  return {
    get locale() {
      return currentLocale;
    },
    set locale(l: string) {
      currentLocale = l;
      setCurrentLocale(l);
    },
    t: (key: string, params?: Record<string, string | number>) =>
      t(key, params, currentLocale),
    dict: (locale?: string) => locales[locale || currentLocale] || en,
  };
}

export type { TranslationKeys };
