// ============================================================
//  YouTube Platform Adapter
//  使用更通用的选择器，不依赖 ytd-thumbnail 等特定元素
// ============================================================

import type { PlatformDetection, VideoInfo } from "../core/types";

export function detectYouTube(): PlatformDetection | null {
  if (!location.hostname.includes("youtube.com") && !location.hostname.includes("youtu.be")) {
    return null;
  }
  return {
    platform: "youtube",
    thumbnailSelectors: ["img"],
    linkSelector: "a[href*='/watch'], a[href*='/shorts/']",
  };
}

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * 查找所有视频缩略图。
 *
 * 策略：页面上所有 <a> 链接，找其中包含的 <img>，
 * 过滤出视频链接，取链接中最接近的 <img> 作为缩略图。
 */
export function findYouTubeVideos(): VideoInfo[] {
  const results: VideoInfo[] = [];
  const seen = new Set<string>();

  // 找到页面上所有视频链接
  const videoLinks = document.querySelectorAll<HTMLAnchorElement>(
    "a[href*='/watch'], a[href*='/shorts/']"
  );

  console.log(`[Memeify] YouTube: 找到 ${videoLinks.length} 个视频链接`);

  for (const anchor of videoLinks) {
    const href = anchor.getAttribute("href") || "";
    const fullUrl = href.startsWith("http") ? href : `https://www.youtube.com${href}`;
    const videoId = extractYouTubeVideoId(fullUrl);
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);

    // 在链接内找到第一个 <img>
    const img = anchor.querySelector<HTMLImageElement>("img");
    if (!img) continue;

    // 容器的选择：anchor 的父级 ytd-thumbnail，或 anchor 本身
    const container = anchor.closest<HTMLElement>("ytd-thumbnail") || anchor;

    results.push({
      id: videoId,
      title: "",
      thumbnailEl: img,
      container: container,
      link: anchor,
    });
  }

  console.log(`[Memeify] YouTube: 提取到 ${results.length} 个有效视频`);
  return results;
}

export const youtubeObserverConfig: MutationObserverInit = {
  childList: true,
  subtree: true,
};
