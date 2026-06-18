// ============================================================
//  Background Service Worker
// ============================================================

import { defineBackground } from "wxt/utils/define-background";
import { loadSettings, saveSettings, loadAllPacks } from "../core/storage";
import { checkPackUpdate } from "../core/chr-pack";

export default defineBackground({
  main() {
    // ─── CHR-pack Store 劫持 ───
    const STORE_PATTERNS = [
      "https://chr-pack-store.meme.kibidango.top/dl/*",
      "https://chr-pack-store.vercel.app/dl/*",
    ];

    chrome.webNavigation.onBeforeNavigate.addListener((details) => {
      if (details.frameId !== 0) return;
      const isStore = STORE_PATTERNS.some((p) => {
        const regex = new RegExp("^" + p.replace(/\//g, "\\/").replace(/\*/g, ".*") + "$");
        return regex.test(details.url);
      });
      if (isStore) {
        const encoded = encodeURIComponent(details.url);
        const optUrl = chrome.runtime.getURL("/options.html#install=" + encoded);
        chrome.tabs.update(details.tabId, { url: optUrl });
      }
    });

    // ─── Install / Update handling ───
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === "install" || details.reason === "update") {
        const { defaultSettings } = await import("../core/types");
        const settings = await loadSettings();
        await saveSettings({ ...defaultSettings(), ...settings });
        chrome.alarms.create("check-pack-updates", { periodInMinutes: 60 });
      }
    });

    // ─── Alarm ───
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === "check-pack-updates") {
        const packs = await loadAllPacks();
        for (const [id, pack] of packs) {
          try {
            const info = await checkPackUpdate(pack);
            if (info?.hasUpdate) {
              console.log(`[Memeify] Update for ${pack.manifest.character_name}: v${info.latestVersion}`);
            }
          } catch (err) {
            console.warn(`[Memeify] Update check failed for ${id}:`, err);
          }
        }
      }
    });

    // ─── Messages ───
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === "CHECK_UPDATE") {
        (async () => {
          try {
            const packs = await loadAllPacks();
            const pack = packs.get(message.payload.packId);
            if (!pack) { sendResponse({ success: false, error: "Pack not found" }); return; }
            const result = await checkPackUpdate(pack);
            sendResponse({ success: true, ...result });
          } catch (err: any) { sendResponse({ success: false, error: err.message }); }
        })();
        return true;
      }
    });
  },
});
