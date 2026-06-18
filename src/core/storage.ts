// ============================================================
//  Storage Layer — 极简版
//
//  只做最基本的事：chrome.storage.local 读写。
//  先写入一条测试数据，确认 storage 可用，再继续。
// ============================================================

import { defaultSettings, type ExtensionSettings, type ChrPack, type ChrPackImage, type ChrPackManifest } from "./types";

const SETTINGS_KEY = "memeify-settings";
const PACK_INDEX_KEY = "memeify-pack-index";

interface PackIndexEntry {
  id: string;
  name: string;
  version: string;
  author: string;
  imageCount: number;
  hasIcon: boolean;
}

// ─── 获取 storage ───
// Firefox 的 chrome.storage 兼容层可能有问题，优先使用 browser.storage

function getStorage(): any {
  // 1. 优先 browser.storage.local（Firefox 原生，最可靠）
  const b = (globalThis as any).browser;
  if (b?.storage?.local) {
    return b.storage.local;
  }
  // 2. 降级 chrome.storage.local（Chrome，以及 Firefox 的兼容层）
  const c = (globalThis as any).chrome;
  if (c?.storage?.local) {
    return c.storage.local;
  }
  throw new Error("No storage API");
}

// ─── 最基础的读写测试 ───

const TEST_KEY = "memeify-storage-test";
let storageWorks: boolean | null = null;

async function testStorage(): Promise<boolean> {
  if (storageWorks !== null) return storageWorks;
  try {
    const ts = String(Date.now());
    await getStorage().set({ [TEST_KEY]: ts });
    const r = await getStorage().get(TEST_KEY);
    const v = (r as any)?.[TEST_KEY];
    storageWorks = v === ts;
    if (!storageWorks) {
      console.error("[Memeify] 存储测试失败：写入值不匹配", { wrote: ts, read: v });
    } else {
      console.log("[Memeify] 存储测试通过");
    }
  } catch (e) {
    storageWorks = false;
    console.error("[Memeify] 存储测试异常:", e);
  }
  return storageWorks;
}

// ─── Settings ───

export async function loadSettings(): Promise<ExtensionSettings> {
  if (!(await testStorage())) return defaultSettings();
  try {
    const result = await getStorage().get(SETTINGS_KEY);
    const raw = (result as any)?.[SETTINGS_KEY];
    if (raw) return { ...defaultSettings(), ...raw };
  } catch (e) {
    console.warn("[Memeify] Settings error:", e);
  }
  return defaultSettings();
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  if (!(await testStorage())) return;
  await getStorage().set({ [SETTINGS_KEY]: settings });
  notifyTabs({ type: "SETTINGS_UPDATED", payload: settings }).catch(() => {});
}

export async function updateSettings(
  partial: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const updated = { ...current, ...partial };
  await saveSettings(updated);
  return updated;
}

// ─── 图片 key 生成 ───

const MNF = (id: string) => `pack:${id}:m`;
const ICN = (id: string) => `pack:${id}:i`;
const IMG = (id: string, k: number) => `pack:${id}:img:${k}`;

// ─── Pack CRUD ───

export async function savePack(pack: ChrPack): Promise<void> {
  if (!(await testStorage())) {
    throw new Error("浏览器存储不可用，无法安装角色包");
  }

  // 1. Manifest
  await getStorage().set({ [MNF(pack.id)]: pack.manifest });

  // 2. Icon
  if (pack.iconUrl) {
    await getStorage().set({ [ICN(pack.id)]: pack.iconUrl });
  }

  // 3. 图片分批
  const entries = Array.from(pack.images.entries());
  const BATCH = 50;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch: Record<string, unknown> = {};
    for (let j = i; j < Math.min(i + BATCH, entries.length); j++) {
      const [key, img] = entries[j]!;
      batch[IMG(pack.id, key)] = img.dataUrl;
    }
    await getStorage().set(batch);
  }

  // 4. 索引
  const idxEntry: PackIndexEntry = {
    id: pack.id,
    name: pack.manifest.character_name,
    version: pack.manifest.version,
    author: pack.manifest.author,
    imageCount: pack.images.size,
    hasIcon: !!pack.iconUrl,
  };

  // 先读取现有索引
  let currentIdx: PackIndexEntry[] = [];
  try {
    const r = await getStorage().get(PACK_INDEX_KEY);
    currentIdx = ((r as any)?.[PACK_INDEX_KEY] as PackIndexEntry[]) || [];
  } catch {}

  // 去掉旧条目 + 追加新条目
  const newIdx = currentIdx.filter((e) => e.id !== pack.id);
  newIdx.push(idxEntry);

  // 写入索引
  await getStorage().set({ [PACK_INDEX_KEY]: newIdx });

  // 5. 验证：用循环反复读取，直到读到或超时
  const deadline = Date.now() + 15000; // 最多等 15 秒
  while (Date.now() < deadline) {
    await sleep(500);
    try {
      const r = await getStorage().get(PACK_INDEX_KEY);
      const idx = ((r as any)?.[PACK_INDEX_KEY] as PackIndexEntry[]) || [];
      if (idx.some((e) => e.id === pack.id)) {
        return; // 成功！
      }
    } catch {}
    console.log("[Memeify] 等待索引落盘...");
  }

  // 超时 — 做完整诊断
  console.error("[Memeify] ===== 存储诊断 =====");
  try {
    const r = await getStorage().get(PACK_INDEX_KEY);
    console.error("[Memeify] 索引 key 读取结果:", JSON.stringify(r).slice(0, 500));
    const r2 = await getStorage().get(MNF(pack.id));
    console.error("[Memeify] manifest key 读取结果:", JSON.stringify(r2).slice(0, 200));
    const r3 = await getStorage().get(IMG(pack.id, 1));
    console.error("[Memeify] 第一张图 key 读取结果:", r3 ? "存在" : "不存在");
    // 列出所有 key
    const all = await getAllKeys();
    console.error("[Memeify] 存储中所有 key:", all);
  } catch (e) {
    console.error("[Memeify] 诊断异常:", e);
  }
  console.error("[Memeify] ===================");

  throw new Error(
    "安装失败：索引写入后无法读取（超时 15 秒）。\n" +
    "诊断信息已输出到浏览器控制台 (Ctrl+Shift+J)。"
  );
}

/** 列出所有存储 key（Firefox 不支持 get(null)，所以逐个尝试） */
async function getAllKeys(): Promise<string[]> {
  const keys: string[] = [];
  // 尝试已知前缀
  const prefixes = ["memeify-", "pack:"];
  for (const p of prefixes) {
    try {
      const r = await getStorage().get(p);
      if (r) Object.keys(r).forEach((k) => keys.push(k));
    } catch {}
  }
  return keys;
}

export async function removePack(packId: string): Promise<void> {
  if (!(await testStorage())) return;
  // 读取索引获取图片数量
  let imageCount = 0;
  try {
    const r = await getStorage().get(PACK_INDEX_KEY);
    const idx = ((r as any)?.[PACK_INDEX_KEY] as PackIndexEntry[]) || [];
    const entry = idx.find((e) => e.id === packId);
    imageCount = entry?.imageCount ?? 0;
  } catch {}

  const keys: string[] = [MNF(packId), ICN(packId)];
  for (let k = 1; k <= imageCount; k++) keys.push(IMG(packId, k));

  // 分批删除
  for (let i = 0; i < keys.length; i += 50) {
    await getStorage().remove(keys.slice(i, i + 50));
  }

  // 更新索引
  try {
    const r = await getStorage().get(PACK_INDEX_KEY);
    const idx = ((r as any)?.[PACK_INDEX_KEY] as PackIndexEntry[]) || [];
    const newIdx = idx.filter((e) => e.id !== packId);
    await getStorage().set({ [PACK_INDEX_KEY]: newIdx });
  } catch {}
}

export async function loadPack(packId: string): Promise<ChrPack | undefined> {
  if (!(await testStorage())) return undefined;
  let index: PackIndexEntry[] = [];
  try {
    const r = await getStorage().get(PACK_INDEX_KEY);
    index = ((r as any)?.[PACK_INDEX_KEY] as PackIndexEntry[]) || [];
  } catch {}
  const entry = index.find((e) => e.id === packId);
  if (!entry) return undefined;

  const mResult = await getStorage().get(MNF(packId));
  const manifest = (mResult as any)?.[MNF(packId)] as ChrPackManifest | undefined;
  if (!manifest) return undefined;

  const iResult = await getStorage().get(ICN(packId));
  const iconUrl = (iResult as any)?.[ICN(packId)] as string | undefined;

  const images = new Map<number, ChrPackImage>();
  const CHUNK = 50;
  for (let start = 1; start <= entry.imageCount; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, entry.imageCount);
    const batchKeys: string[] = [];
    for (let k = start; k <= end; k++) batchKeys.push(IMG(packId, k));
    const batchResult = await getStorage().get(batchKeys);
    const br = batchResult as Record<string, unknown>;
    for (let k = start; k <= end; k++) {
      const dataUrl = br?.[IMG(packId, k)] as string | undefined;
      if (dataUrl) images.set(k, { key: k, dataUrl });
    }
  }

  return { id: packId, manifest, images, iconUrl };
}

export async function loadAllPacks(): Promise<Map<string, ChrPack>> {
  if (!(await testStorage())) return new Map();
  let index: PackIndexEntry[] = [];
  try {
    const r = await getStorage().get(PACK_INDEX_KEY);
    index = ((r as any)?.[PACK_INDEX_KEY] as PackIndexEntry[]) || [];
  } catch {}
  const map = new Map<string, ChrPack>();
  for (const entry of index) {
    try {
      const pack = await loadPack(entry.id);
      if (pack) map.set(pack.id, pack);
    } catch (e) {
      console.warn(`[Memeify] Failed to load pack ${entry.id}:`, e);
    }
  }
  return map;
}

// ─── 内容脚本专用 ───

export async function getPackImage(packId: string, imageKey: number): Promise<ChrPackImage | undefined> {
  try {
    const result = await getStorage().get(IMG(packId, imageKey));
    const dataUrl = (result as any)?.[IMG(packId, imageKey)] as string | undefined;
    if (!dataUrl) return undefined;
    return { key: imageKey, dataUrl };
  } catch { return undefined; }
}

export async function getPackImageCount(packId: string): Promise<number | undefined> {
  try {
    const r = await getStorage().get(PACK_INDEX_KEY);
    const index = ((r as any)?.[PACK_INDEX_KEY] as PackIndexEntry[]) || [];
    return index.find((e) => e.id === packId)?.imageCount;
  } catch { return undefined; }
}

// ─── 清理 ───

export async function clearAllPacks(): Promise<void> {
  try {
    const r = await getStorage().get(PACK_INDEX_KEY);
    const index = ((r as any)?.[PACK_INDEX_KEY] as PackIndexEntry[]) || [];
    const keys: string[] = [PACK_INDEX_KEY];
    for (const e of index) {
      keys.push(MNF(e.id), ICN(e.id));
      for (let k = 1; k <= e.imageCount; k++) keys.push(IMG(e.id, k));
    }
    for (let i = 0; i < keys.length; i += 50) {
      await getStorage().remove(keys.slice(i, i + 50));
    }
  } catch {}
}

// ─── Tab 通知 ───

async function notifyTabs(msg: { type: string; payload?: unknown }): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs) return;
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try { await chrome.tabs.sendMessage(tab.id, msg).catch(() => {}); } catch {}
      }
    }
  } catch {}
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
