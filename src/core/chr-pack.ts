// ============================================================
//  CHR-pack Manager — load, parse, and install character packs
// ============================================================

import type { ChrPackManifest, ChrPack, ChrPackImage } from "./types";
import { savePack, removePack } from "./storage";

/**
 * Download a CHR-pack from a URL, parse its manifest & images.
 *
 * GitHub 的 release zip 有 CORS 限制，如果直接请求失败
 * 会自动尝试使用 API zipball URL。
 */
export async function installPackFromUrl(
  url: string,
  onProgress?: (phase: string, pct: number) => void
): Promise<ChrPack> {
  onProgress?.("downloading", 0);

  // 尝试下载
  const blob = await tryDownload(url);
  return installPackFromBlob(blob, onProgress, "extracting");
}

/** 尝试用多种方式下载，处理 GitHub 和 Store 的 CORS */
async function tryDownload(url: string): Promise<Blob> {
  // 1. 直接 fetch（可以处理无 CORS 的 URL）
  const resp = await fetch(url).catch(() => null);
  if (resp?.ok) return resp.blob();

  // 2. Store URL：用 redirect:manual 获取跳转目标
  if (url.includes("chr-pack-store")) {
    const r = await fetch(url, { redirect: "manual" } as any).catch(() => null);
    if (r && (r.status === 302 || r.status === 301 || r.status === 303)) {
      const location = r.headers.get("Location");
      if (location) {
        // 对跳转目标提取 GitHub 信息
        const info = extractGitHubInfo(location);
        if (info) {
          const apiUrl = `https://api.github.com/repos/${info.user}/${info.repo}/zipball/${info.tag}`;
          const r2 = await fetch(apiUrl).catch(() => null);
          if (r2?.ok) return r2.blob();
        }
        // 或者直接尝试下载跳转目标
        const r3 = await fetch(location).catch(() => null);
        if (r3?.ok) return r3.blob();
      }
    }
  }

  // 3. 从 URL 提取 GitHub user/repo/tag
  const info = extractGitHubInfo(url);
  if (info) {
    // API zipball URL（有 CORS）
    const apiUrl = `https://api.github.com/repos/${info.user}/${info.repo}/zipball/${info.tag}`;
    const r2 = await fetch(apiUrl).catch(() => null);
    if (r2?.ok) return r2.blob();
  }

  throw new Error(`无法下载角色包，请尝试手动下载 .zip 文件后用「从文件安装」。`);
}

/** 从各种 GitHub URL 中提取 user/repo/tag */
function extractGitHubInfo(url: string): { user: string; repo: string; tag: string } | null {
  // archive URL: /user/repo/archive/refs/tags/v1.0.0.zip
  const m1 = url.match(/github\.com\/([^/]+)\/([^/]+)\/archive\/refs\/tags\/(.+?)(?:\.zip)?$/);
  if (m1) return { user: m1[1]!, repo: m1[2]!, tag: m1[3]!.replace(/\.zip$/, "") };
  // release download URL: /user/repo/releases/download/v1.0.0/file.zip
  const m2 = url.match(/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/.+$/);
  if (m2) return { user: m2[1]!, repo: m2[2]!, tag: m2[3]! };
  // API zipball URL: api.github.com/repos/user/repo/zipball/v1.0.0
  const m3 = url.match(/api\.github\.com\/repos\/([^/]+)\/([^/]+)\/zipball\/(.+)$/);
  if (m3) return { user: m3[1]!, repo: m3[2]!, tag: m3[3]! };
  return null;
}

/**
 * Install a CHR-pack from a File object (e.g., from a file picker).
 * Wraps installPackFromBlob with the file name as context.
 */
export async function installPackFromFile(
  file: File,
  onProgress?: (phase: string, pct: number) => void
): Promise<ChrPack> {
  return installPackFromBlob(file, onProgress, "parsing");
}

/**
 * Core: parse a zip Blob/File into a ChrPack, save to storage.
 *
 * The zip must contain:
 *   - manifest.json  (the CHR-pack manifest)
 *   - icon.png       (pack icon, optional)
 *   - images/*.png   (numbered image files, e.g., "1.png", "42.png")
 */
async function installPackFromBlob(
  blob: Blob,
  onProgress?: (phase: string, pct: number) => void,
  initialPhase?: string
): Promise<ChrPack> {
  onProgress?.(initialPhase ?? "extracting", 30);

  // Load JSZip dynamically (keeps it out of the initial bundle)
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(blob);
  onProgress?.("parsing", 50);

  // ─── Detect the base directory ───
  // Zips downloaded from GitHub releases have a top-level folder like
  // "CHR-pack-example-1.0.0/". We auto-detect it by looking for
  // manifest.json at any depth and using that directory as the base.
  const allFiles = Object.keys(zip.files).filter((name) => !zip.files[name]!.dir);

  // Find manifest.json anywhere in the zip
  const manifestEntry = allFiles.find(
    (name) => name.replace(/\\/g, "/").split("/").pop() === "manifest.json"
  );
  if (!manifestEntry) {
    throw new Error("Invalid CHR-pack: missing manifest.json");
  }

  // Determine the base prefix (the directory containing manifest.json)
  const baseDir = manifestEntry.replace(/\\/g, "/").replace(/\/manifest\.json$/, "");
  const prefix = baseDir ? baseDir + "/" : "";

  // Helper: resolve a path relative to the base directory
  const resolvePath = (relativePath: string) => `${prefix}${relativePath}`;

  // Parse manifest
  const manifestFile = zip.file(manifestEntry)!;
  const manifestText = await manifestFile.async("string");
  const manifest: ChrPackManifest = JSON.parse(manifestText);

  if (!manifest.character_name || !manifest.version) {
    throw new Error("Invalid CHR-pack manifest: missing required fields");
  }

  // Extract images — look under the resolved images/ path
  const imagesPrefix = resolvePath("images/");
  const images = new Map<number, ChrPackImage>();
  const imageFiles = allFiles.filter(
    (name) =>
      name.startsWith(imagesPrefix) &&
      !name.endsWith("/") &&
      /\.(png|jpg|jpeg|webp)$/i.test(name)
  );

  for (const filePath of imageFiles) {
    // Extract the numeric key from the filename (after the images/ prefix)
    const relativeName = filePath.slice(imagesPrefix.length);
    const match = relativeName.match(/^(\d+)\./);
    if (!match) continue;
    const key = parseInt(match[1]!, 10);
    const file = zip.files[filePath]!;
    const blobData = await file.async("blob");
    const dataUrl = await blobToDataUrl(blobData);
    images.set(key, { key, dataUrl });
  }

  if (images.size === 0) {
    throw new Error("Invalid CHR-pack: no images found in images/ directory");
  }
  onProgress?.("storing", 80);

  // Extract icon
  let iconUrl: string | undefined;
  if (manifest.icon) {
    const resolvedIcon = resolvePath(manifest.icon);
    const iconFile = zip.file(resolvedIcon);
    if (iconFile) {
      const iconBlob = await iconFile.async("blob");
      iconUrl = await blobToDataUrl(iconBlob);
    }
  }

  // Build & save
  const id = generatePackId(manifest);
  const pack: ChrPack = { id, manifest, images, iconUrl };
  await savePack(pack);
  onProgress?.("done", 100);

  return pack;
}

/**
 * Remove a pack from storage
 */
export async function uninstallPack(packId: string): Promise<void> {
  await removePack(packId);
}

/**
 * Generate a unique ID for a pack from its manifest
 */
function generatePackId(manifest: ChrPackManifest): string {
  const name = manifest.character_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${name}-${manifest.version}`;
}

/**
 * Check for updates for a pack
 */
export async function checkPackUpdate(
  pack: ChrPack
): Promise<{ hasUpdate: boolean; latestVersion: string; downloadUrl: string } | null> {
  try {
    const response = await fetch(pack.manifest.version_check_url);
    if (!response.ok) return null;

    const data = await response.json();
    const latestTag = data.tag_name || data.name;
    if (!latestTag) return null;

    const latestVersion = latestTag.replace(/^v/, "");
    const hasUpdate = compareVersions(latestVersion, pack.manifest.version) > 0;

    // 优先使用 API zipball_url（有 CORS 支持），其次 asset URL
    const downloadUrl = data.zipball_url || data.html_url || "";

    return { hasUpdate, latestVersion, downloadUrl };
  } catch {
    return null;
  }
}

// ─── Helpers ───

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Simple semver comparison. Returns >0 if a > b, <0 if a < b, 0 if equal.
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/**
 * Get a localized field from the manifest
 */
export function getLocalizedField(
  manifest: ChrPackManifest,
  field: "character_name" | "description",
  locale: string
): string {
  if (locale !== "en" && manifest.localizations?.[locale]?.[field]) {
    return manifest.localizations[locale]![field]!;
  }
  return manifest[field];
}
