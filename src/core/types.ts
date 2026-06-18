// ============================================================
//  Core Type Definitions for Memeify Thumbnail Extension
// ============================================================

/** Supported video platforms */
export type Platform = "youtube" | "bilibili" | "niconico";

/** All supported platforms list */
export const PLATFORMS: Platform[] = ["youtube", "bilibili", "niconico"];

/** User-facing locale */
export type Locale = "en" | "zh";

/** A character pack (CHR-pack) manifest — mirrors the repo's manifest.json */
export interface ChrPackManifest {
  character_name: string;
  description: string;
  version: string;
  icon: string;
  author: string;
  version_check_url: string;
  update_url: string;
  localizations?: Record<string, Record<string, string>>;
}

/** A single image entry inside a CHR-pack */
export interface ChrPackImage {
  /** Unique numeric key matching the image filename (e.g., "1", "42") */
  key: number;
  /** Data URL of the image (loaded into memory) */
  dataUrl: string;
}

/** Full CHR-pack loaded into the extension */
export interface ChrPack {
  /** Unique identifier (derived from the manifest) */
  id: string;
  /** The original manifest */
  manifest: ChrPackManifest;
  /** All images keyed by their numeric key */
  images: Map<number, ChrPackImage>;
  /** Path to the pack icon */
  iconUrl?: string;
}

/** Per-platform configuration */
export interface PlatformConfig {
  enabled: boolean;
  /** Specific pack ID to use; empty = use default */
  packId: string;
  /** Per-platform image key override; empty = auto */
  imageKey: number;
}

/** Top-level extension settings */
export interface ExtensionSettings {
  /** Global enable/disable */
  enabled: boolean;
  /** Active CHR-pack IDs (支持多个同时生效) */
  activePackIds: string[];
  /** Per-platform overrides */
  platforms: Record<Platform, PlatformConfig>;
  /** Theme: "light" | "dark" | "auto" */
  theme: "light" | "dark" | "auto";
  /** User locale preference */
  locale: Locale;
  /** Last check for pack updates (timestamp) */
  lastUpdateCheck: number;
}

/** Default settings factory */
export function defaultSettings(): ExtensionSettings {
  return {
    enabled: true,
    activePackIds: [],
    platforms: {
      youtube: { enabled: true, packId: "", imageKey: 0 },
      bilibili: { enabled: true, packId: "", imageKey: 0 },
      niconico: { enabled: true, packId: "", imageKey: 0 },
    },
    theme: "auto",
    locale: "en",
    lastUpdateCheck: 0,
  };
}

/** Messages sent between content script and background */
export interface ExtensionMessage {
  type: "SETTINGS_UPDATED" | "PACK_INSTALLED" | "PACK_REMOVED" | "REPLACE_THUMBNAILS";
  payload?: unknown;
}

/** Result of detecting which platform a URL belongs to */
export interface PlatformDetection {
  platform: Platform;
  /** CSS selectors for thumbnail containers on this platform */
  thumbnailSelectors: string[];
  /** Selector for the video link to extract video ID */
  linkSelector: string;
}

/** Video info extracted from a page */
export interface VideoInfo {
  /** Video ID */
  id: string;
  /** Video title */
  title: string;
  /**
   * Thumbnail element — 通常是 <img>，但也可以是含 background-image
   * 的 <div> 等。用于 getBoundingClientRect() 定位。
   */
  thumbnailEl: HTMLElement;
  /** Container/parent element */
  container: HTMLElement;
  /** Link element (a tag) */
  link: HTMLAnchorElement | null;
}
