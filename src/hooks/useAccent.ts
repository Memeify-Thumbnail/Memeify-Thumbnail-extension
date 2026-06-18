// ============================================================
//  Accent color injection (from HajimariUI)
//  Injects <style id="memeify-accent-css"> with OKLCH colors
// ============================================================

import { useEffect } from "react";

const DEFAULT_HUE = 345;

export function useAccent(hue: number = DEFAULT_HUE) {
  useEffect(() => {
    const existing = document.getElementById("memeify-accent-css");
    if (existing) existing.remove();

    const style = document.createElement("style");
    style.id = "memeify-accent-css";
    style.textContent = `
      :root {
        --hue: ${hue};
        --primary:    oklch(0.68 0.16 ${hue});
        --primary-fg: oklch(0.99 0 0);
        --ring:       oklch(0.6 0.16 ${hue});
        --blob:       oklch(0.65 0.16 ${hue} / 0.3);
      }
      .dark {
        --primary:    oklch(0.72 0.14 ${hue});
        --ring:       oklch(0.65 0.14 ${hue});
        --blob:       oklch(0.6 0.14 ${hue} / 0.25);
      }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById("memeify-accent-css");
      if (el) el.remove();
    };
  }, [hue]);
}
