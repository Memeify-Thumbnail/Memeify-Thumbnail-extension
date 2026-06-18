// ============================================================
//  Thumbnail Overlayer
//
//  视频页 → 父容器内插入覆盖层
//  首页   → 挂到 <html> 上
//  支持多个角色包同时生效，按视频 ID 哈希分配
// ============================================================

import { loadSettings, getPackImage, getPackImageCount, loadPack } from "./storage";
import type { Platform, VideoInfo } from "./types";

const OVERLAY_CLASS = "memeify-overlay-img";
const overlaid = new WeakMap<HTMLElement, HTMLImageElement>();
let stylesInjected = false;
let lastUrl = "";

function isBiliVideoPage(): boolean {
  return location.hostname.includes("bilibili.com") && location.pathname.includes("/video/");
}

function injectStyles() {
  if (stylesInjected) return;
  const s = document.createElement("style");
  s.id = "memeify-overlay-styles";
  s.textContent = `
html { position: relative !important; }
.${OVERLAY_CLASS} {
  position: absolute !important;
  pointer-events: auto !important;
  object-fit: contain !important;
  z-index: 10 !important;
  display: block !important;
  border: none !important;
  margin: 0 !important; padding: 0 !important;
  background: none !important; box-shadow: none !important;
  border-radius: 0 !important;
  max-width: none !important; max-height: none !important;
  transition: opacity 0.15s ease !important;
}
.${OVERLAY_CLASS}:hover { opacity: 0 !important; }`;
  document.head.appendChild(s);
  stylesInjected = true;
}

export async function overlayThumbnails(
  _platform: Platform,
  videos: VideoInfo[]
): Promise<void> {
  const settings = await loadSettings();
  if (!settings.enabled) return;
  const cfg = settings.platforms[_platform];
  if (!cfg?.enabled) return;

  // 收集所有启用的 pack ID
  let packIds = cfg.packId ? [cfg.packId] : settings.activePackIds;
  if (!packIds || packIds.length === 0) return;

  const cur = location.href;
  if (lastUrl !== "" && cur !== lastUrl) { removeOverlays(); }
  lastUrl = cur;

  injectStyles();
  const isVideoPage = isBiliVideoPage();

  for (const video of videos) {
    if (overlaid.has(video.container)) continue;

    // 按视频 ID 哈希从多个 pack 中选一个
    const packIndex = Math.abs(hashSimple(video.id)) % packIds.length;
    const packId = packIds[packIndex];

    let key = cfg.imageKey;
    if (!key) {
      const total = await getPackImageCount(packId);
      if (!total) continue;
      key = hashKey(video.id, total);
    }

    const chrImg = await getPackImage(packId, key);
    if (!chrImg) continue;

    if (isVideoPage) {
      placeInParent(video, chrImg.dataUrl);
    } else {
      placeOnHtml(video, chrImg.dataUrl);
    }
  }
}

function placeInParent(video: VideoInfo, dataUrl: string): boolean {
  const thumb = video.thumbnailEl;
  const parent = thumb.parentElement;
  if (!parent) return false;
  if (overlaid.has(video.container)) return false;
  if (parent.querySelector("." + OVERLAY_CLASS)) return false;

  const pos = getComputedStyle(parent).position;
  if (pos === "static") (parent as HTMLElement).style.position = "relative";

  const pRect = parent.getBoundingClientRect();
  const tRect = thumb.getBoundingClientRect();

  const ov = document.createElement("img");
  ov.className = OVERLAY_CLASS;
  ov.src = dataUrl;
  ov.alt = ""; ov.draggable = false;
  ov.style.left = (tRect.left - pRect.left) + "px";
  ov.style.top = (tRect.top - pRect.top) + "px";
  ov.style.width = tRect.width + "px";
  ov.style.height = tRect.height + "px";

  thumb.insertAdjacentElement("afterend", ov);
  overlaid.set(video.container, ov);
  return true;
}

function placeOnHtml(video: VideoInfo, dataUrl: string): boolean {
  const el = video.thumbnailEl;
  if (overlaid.has(video.container)) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 5 || r.height < 5) return false;

  const uid = "mi" + String(Math.random()).slice(2, 10);
  el.setAttribute("data-memeify-id", uid);

  const ov = document.createElement("img");
  ov.className = OVERLAY_CLASS;
  ov.src = dataUrl; ov.alt = ""; ov.draggable = false;
  ov.dataset.memeifyTarget = uid;
  ov.style.left = (r.left + window.scrollX) + "px";
  ov.style.top = (r.top + window.scrollY) + "px";
  ov.style.width = r.width + "px";
  ov.style.height = r.height + "px";

  document.documentElement.appendChild(ov);
  overlaid.set(video.container, ov);
  ensureListeners();
  return true;
}

let listenersAttached = false;

function ensureListeners() {
  if (listenersAttached) return;
  let ticking = false;
  const refresh = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      for (const ov of document.querySelectorAll<HTMLImageElement>("." + OVERLAY_CLASS)) {
        if (ov.parentElement !== document.documentElement) continue;
        const uid = ov.dataset.memeifyTarget;
        if (!uid) { ov.remove(); continue; }
        const target = document.querySelector<HTMLElement>("[data-memeify-id='" + uid + "']");
        if (!target) { ov.remove(); continue; }
        const cs = getComputedStyle(target);
        if (cs.display === "none" || cs.visibility === "hidden") { ov.style.display = "none"; continue; }
        const r = target.getBoundingClientRect();
        if (r.width < 5 || r.height < 5) { ov.style.display = "none"; continue; }
        ov.style.display = "block";
        ov.style.left = (r.left + window.scrollX) + "px";
        ov.style.top = (r.top + window.scrollY) + "px";
        ov.style.width = r.width + "px";
        ov.style.height = r.height + "px";
      }
    });
  };
  window.addEventListener("scroll", refresh, { passive: true });
  window.addEventListener("resize", refresh, { passive: true });
  setInterval(refresh, 2000);
  listenersAttached = true;
}

export function removeOverlays(): void {
  document.querySelectorAll("." + OVERLAY_CLASS).forEach((el) => el.remove());
  document.querySelectorAll("[data-memeify-id]").forEach((el) => el.removeAttribute("data-memeify-id"));
}

function hashKey(videoId: string, total: number): number {
  let h = 0;
  for (let i = 0; i < videoId.length; i++) {
    h = ((h << 5) - h) + videoId.charCodeAt(i);
    h |= 0;
  }
  return ((Math.abs(h) % total) + 1);
}

function hashSimple(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return h;
}
