export const en = {
  extName: "Memeify Thumbnail",
  extDescription: "Replace video thumbnails with character images from CHR-packs on YouTube, Bilibili, and Niconico.",

  // Options page
  options: {
    title: "Memeify Thumbnail Settings",
    general: "General",
    appearance: "Appearance",
    packs: "Character Packs",
    platforms: "Platforms",
    about: "About",

    // General
    enableExtension: "Enable Extension",
    enableExtensionDesc: "Globally enable or disable thumbnail replacement",
    activePack: "Active Character Pack",
    activePackDesc: "Select which character pack to use across all platforms",
    noPack: "No packs installed. Install one below.",

    // Appearance
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeAuto: "System",
    locale: "Language",

    // Packs
    installPack: "Install Pack",
    installPackDesc: "Paste the download URL of a CHR-pack zip file",
    installFromUrl: "Install from URL",
    installFromFile: "Install from file",
    packUrlPlaceholder: "https://github.com/.../pack.zip",
    installing: "Installing...",
    installed: "Installed",
    installError: "Install failed",
    uninstall: "Uninstall",
    checkUpdates: "Check for Updates",
    updateAvailable: "Update available",
    upToDate: "Up to date",
    packName: "Name",
    packVersion: "Version",
    packAuthor: "Author",
    packDescription: "Description",
    packImages: "Images",
    imagesCount: "{count} images",

    // Platforms
    platformYoutube: "YouTube",
    platformBilibili: "Bilibili",
    platformNiconico: "Niconico",
    enablePlatform: "Enable on {platform}",
    platformPackOverride: "Pack Override",
    platformPackOverrideDesc: "Use a different pack for this platform (leave empty for global pack)",

    // About
    version: "Version",
    projectUrl: "Project URL",
    reportIssue: "Report Issue",
    credits: "Credits",
    license: "License",
  },

  // Popup
  popup: {
    title: "Memeify",
    enabled: "Enabled",
    disabled: "Disabled",
    openOptions: "Open Settings",
    currentPack: "Current Pack",
    noPack: "No pack",
    quickToggle: "Toggle on this site",
  },

  // Content script
  content: {
    replaced: "Thumbnail replaced by Memeify",
    packLoadError: "Failed to load character pack",
  },
};

export type TranslationKeys = typeof en;
