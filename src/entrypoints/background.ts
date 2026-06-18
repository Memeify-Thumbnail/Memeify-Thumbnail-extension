// ============================================================
//  Background Service Worker
// ============================================================

import { loadSettings, saveSettings, loadAllPacks } from "../core/storage";
import { checkPackUpdate, installPackFromUrl } from "../core/chr-pack";

// ─── CHR-pack Store 劫持 ───

const STORE_PATTERNS = [
  "https://chr-pack-store.meme.kibidango.top/dl/*",
  "https://chr-pack-store.vercel.app/dl/*",
];

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // 只处理顶层框架（非 iframe）
  if (details.frameId !== 0) return;
  const url = details.url;
  const isStore = STORE_PATTERNS.some((p) => {
    const regex = new RegExp(
      "^" + p.replace(/\//g, "\\/").replace(/\*/g, ".*") + "$"
    );
    return regex.test(url);
  });
  if (isStore) {
    console.log("[Memeify] Store redirect:", url);
    const encoded = encodeURIComponent(url);
    const optUrl = chrome.runtime.getURL("/options.html#install=" + encoded);
    chrome.tabs.update(details.tabId, { url: optUrl });
  }
});

// ─── Install / Update handling ───

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install" || details.reason === "update") {
    // Initialize default settings
    const { defaultSettings } = await import("../core/types");
    const settings = await loadSettings();
    await saveSettings({ ...defaultSettings(), ...settings });

    // Set up periodic pack update checks
    chrome.alarms.create("check-pack-updates", { periodInMinutes: 60 });
  }
});

// ─── Alarm: periodic pack update checks ───

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "check-pack-updates") {
    await checkAllPackUpdates();
  }
});

async function checkAllPackUpdates() {
  const packs = await loadAllPacks();
  for (const [id, pack] of packs) {
    try {
      const updateInfo = await checkPackUpdate(pack);
      if (updateInfo?.hasUpdate) {
        console.log(`[Memeify] Update available for ${pack.manifest.character_name}: v${updateInfo.latestVersion}`);
        // Store update info for the options page to display
        await chrome.storage.local.set({
          [`update-${id}`]: {
            latestVersion: updateInfo.latestVersion,
            downloadUrl: updateInfo.downloadUrl,
            checkedAt: Date.now(),
          },
        });
      }
    } catch (err) {
      console.warn(`[Memeify] Failed to check update for ${id}:`, err);
    }
  }
}

// ─── Message forwarding ───

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INSTALL_PACK") {
    installPackFromUrl(message.payload.url, (phase, pct) => {
      // Could broadcast progress here
    })
      .then((pack) => {
        sendResponse({ success: true, packId: pack.id });
        // Notify all tabs
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: "PACK_INSTALLED",
                payload: { packId: pack.id },
              }).catch(() => {});
            }
          }
        });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.type === "CHECK_UPDATE") {
    (async () => {
      try {
        const packs = await loadAllPacks();
        const pack = packs.get(message.payload.packId);
        if (!pack) {
          sendResponse({ success: false, error: "Pack not found" });
          return;
        }
        const result = await checkPackUpdate(pack);
        sendResponse({ success: true, ...result });
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});

export default {};
