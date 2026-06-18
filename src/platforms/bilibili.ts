// ============================================================
//  Bilibili Platform Adapter
// ============================================================

import type { PlatformDetection, VideoInfo } from "../core/types";

export function detectBilibili(): PlatformDetection | null {
  if (!location.hostname.includes("bilibili.com")) {
    return null;
  }
  return {
    platform: "bilibili",
    thumbnailSelectors: ["img"],
    linkSelector: "a[href*='/video/']",
  };
}

export function extractBilibiliVideoId(url: string): string | null {
  const bvMatch = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
  if (bvMatch?.[1]) return bvMatch[1];
  const avMatch = url.match(/\/video\/(av\d+)/i);
  if (avMatch?.[1]) return avMatch[1];
  return null;
}

export function findBilibiliVideos(): VideoInfo[] {
  const results: VideoInfo[] = [];
  const seen = new Set<string>();

  const links = document.querySelectorAll<HTMLAnchorElement>("a[href*='/video/']");
  console.log(`[Memeify] Bilibili: 找到 ${links.length} 个视频链接`);

  for (const anchor of links) {
    const href = anchor.getAttribute("href") || "";
    const fullUrl = href.startsWith("http") ? href : `https:${href}`;
    const videoId = extractBilibiliVideoId(fullUrl);
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);

    const img = anchor.querySelector<HTMLImageElement>("img");
    if (!img) continue;

    // 容器 = 最近的卡片容器，或直接使用 img 的父元素
    const container = anchor.closest<HTMLElement>(
      ".bili-video-card, .video-card, .up-video-card, .video-item"
    ) || anchor.parentElement || anchor;

    results.push({
      id: videoId,
      title: "",
      thumbnailEl: img,
      container: container,
      link: anchor,
    });
  }

  console.log(`[Memeify] Bilibili: 提取到 ${results.length} 个有效视频`);
  return results;
}

export const bilibiliObserverConfig: MutationObserverInit = {
  childList: true,
  subtree: true,
};
