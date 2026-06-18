// ============================================================
//  Niconico Platform Adapter
//
//  Niconico 的缩略图是 div 的 CSS background-image，不是 <img>。
//  直接使用该 div 作为 thumbnailEl 定位。
// ============================================================

import type { PlatformDetection, VideoInfo } from "../core/types";

export function detectNiconico(): PlatformDetection | null {
  if (!location.hostname.includes("nicovideo.jp")) return null;
  return { platform: "niconico", thumbnailSelectors: ["*"], linkSelector: "a[href*='/watch/']" };
}

export function extractNiconicoVideoId(url: string): string | null {
  const m = url.match(/\/watch\/([a-z]+\d+)/i);
  return m?.[1] ?? null;
}

function extractBgUrl(el: Element): string | null {
  const s = el.getAttribute("style");
  if (s) {
    const m = s.match(/background(?:-image)?\s*:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function findNiconicoVideos(): VideoInfo[] {
  const results: VideoInfo[] = [];
  const seen = new Set<string>();

  const links = document.querySelectorAll<HTMLAnchorElement>("a[href*='/watch/']");
  console.log(`[Memeify] Niconico: 找到 ${links.length} 个视频链接`);

  for (const anchor of links) {
    const href = (anchor.getAttribute("href") || "").trim();
    const fullUrl = href.startsWith("http") ? href : `https://nicovideo.jp${href}`;
    const videoId = extractNiconicoVideoId(fullUrl);
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);

    // 找缩略图元素（<img> 或含 background-image 的 div）
    let thumb: HTMLElement | null = null;

    // 1. a 内部的 <img>
    thumb = anchor.querySelector<HTMLImageElement>("img");
    if (thumb instanceof HTMLImageElement && thumb.complete && thumb.naturalWidth > 0) {
      // 有效
    } else {
      // 2. a 内部含 background-image 的元素
      const bgEl = anchor.querySelector<HTMLElement>("[style*='background']");
      if (bgEl && extractBgUrl(bgEl)) { thumb = bgEl; }
      else {
        // 3. 向上找容器，容器本身可能有 background-image
        for (let p = anchor.parentElement; p && p !== document.body; p = p.parentElement) {
          if (extractBgUrl(p)) { thumb = p; break; }
          // 4. 容器内找含 background-image 的子元素
          const innerBg = p.querySelector<HTMLElement>("[style*='background']");
          if (innerBg && extractBgUrl(innerBg)) { thumb = innerBg; break; }
          // 5. 容器内找 <img>
          const innerImg = p.querySelector<HTMLImageElement>("img");
          if (innerImg instanceof HTMLImageElement && innerImg.complete && innerImg.naturalWidth > 0) { thumb = innerImg; break; }
        }
      }
    }

    if (!thumb) continue;

    const container = anchor.closest<HTMLElement>("[class*='Video' i], [class*='Media' i], [class*='Item' i], [class*='Card' i]") || anchor.parentElement || anchor;

    results.push({
      id: videoId,
      title: "",
      thumbnailEl: thumb,
      container,
      link: anchor,
    });
  }

  console.log(`[Memeify] Niconico: 提取到 ${results.length} 个有效视频`);
  return results;
}

export const niconicoObserverConfig: MutationObserverInit = {
  childList: true,
  subtree: true,
};
