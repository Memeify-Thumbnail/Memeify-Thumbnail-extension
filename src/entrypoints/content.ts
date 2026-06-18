// ============================================================
//  Content Script — injected into video platform pages
// ============================================================

import { defineContentScript } from "wxt/utils/define-content-script";
import type { Platform, VideoInfo } from "../core/types";
import { overlayThumbnails, removeOverlays } from "../core/thumbnail-overlayer";

export default defineContentScript({
  matches: [
    "*://*.youtube.com/*",
    "*://*.bilibili.com/*",
    "*://*.nicovideo.jp/*",
  ],
  runAt: "document_idle",
  main() {
    console.log("[Memeify] 内容脚本已加载", location.hostname);
    init();
  },
});

let currentPlatform: Awaited<ReturnType<typeof detectPlatform>>;
let observer: MutationObserver | null = null;
let retryCount = 0;
const MAX_RETRIES = 10;

async function detectPlatform(): Promise<{
  platform: Platform;
  findVideos: () => VideoInfo[];
  observerConfig: MutationObserverInit;
} | null> {
  const [youtube, bilibili, niconico] = await Promise.all([
    import("../platforms/youtube"),
    import("../platforms/bilibili"),
    import("../platforms/niconico"),
  ]);

  if (youtube.detectYouTube()) {
    console.log("[Memeify] 检测到 YouTube");
    return {
      platform: "youtube",
      findVideos: () => youtube.findYouTubeVideos(),
      observerConfig: youtube.youtubeObserverConfig,
    };
  }

  if (bilibili.detectBilibili()) {
    console.log("[Memeify] 检测到 Bilibili");
    return {
      platform: "bilibili",
      findVideos: () => bilibili.findBilibiliVideos(),
      observerConfig: bilibili.bilibiliObserverConfig,
    };
  }

  if (niconico.detectNiconico()) {
    console.log("[Memeify] 检测到 Niconico");
    return { platform: "niconico", findVideos: () => niconico.findNiconicoVideos(), observerConfig: niconico.niconicoObserverConfig };
  }

  console.log("[Memeify] 未检测到支持的平台");
  return null;
}

async function init() {
  currentPlatform = await detectPlatform();
  if (!currentPlatform) return;

  // 首次尝试 — 给页面渲染留时间
  scheduleOverlay(800);

  // MutationObserver 监听动态加载的内容
  observer = new MutationObserver(() => scheduleOverlay(300));
  observer.observe(document.body, { childList: true, subtree: true });

  // 周期性重试（应对 SPA 懒加载）
  const retryTimer = setInterval(() => {
    retryCount++;
    if (retryCount > MAX_RETRIES) {
      clearInterval(retryTimer);
      return;
    }
    scheduleOverlay(100);
  }, 2000);

  // 监听设置更新
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SETTINGS_UPDATED") {
      console.log("[Memeify] 设置已更新，重新应用覆盖层");
      removeOverlays();
      setTimeout(() => runOverlay(), 200);
    }
  });
}

let overlayTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleOverlay(delay: number) {
  if (overlayTimeout) clearTimeout(overlayTimeout);
  overlayTimeout = setTimeout(() => runOverlay(), delay);
}

async function runOverlay() {
  if (!currentPlatform) return;
  const videos = currentPlatform!.findVideos();
  console.log(`[Memeify] 找到 ${videos.length} 个视频缩略图`);
  if (videos.length === 0) return;

  await overlayThumbnails(currentPlatform!.platform, videos);
}
