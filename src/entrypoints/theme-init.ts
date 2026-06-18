// ============================================================
//  Theme Init — tiny blocking script to prevent flash of
//  wrong theme. Loaded via <script src="..."> (not inline).
// ============================================================

import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

export default defineUnlistedScript(() => {
  try {
    const stored =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("memeify-theme")
        : null;
    let isDark: boolean;
    if (stored === "light") isDark = false;
    else if (stored === "dark") isDark = true;
    else if (stored === "auto")
      isDark = matchMedia("(prefers-color-scheme:dark)").matches;
    else isDark = matchMedia("(prefers-color-scheme:dark)").matches; // 默认跟随系统
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {
    // fallback: keep default
  }
});
