import { defineConfig } from "wxt";

export default defineConfig({
  extensionApi: "chrome",
  srcDir: "src",
  outDir: "output",
  modules: ["@wxt-dev/auto-icons"],
  manifest: ({ browser }) => ({
    name: "Memeify Thumbnail",
    description: "__MSG_extDescription__",
    default_locale: "en",
    permissions: [
      "storage",
      "alarms",
      "webNavigation",
    ],
    host_permissions: [
      "*://*.youtube.com/*",
      "*://*.bilibili.com/*",
      "*://*.nicovideo.jp/*",
      "https://github.com/*",
      "https://api.github.com/*",
      "https://codeload.github.com/*",
      "https://objects.githubusercontent.com/*",
      "https://chr-pack-store.meme.kibidango.top/*",
      "https://chr-pack-store.vercel.app/*",
    ],
    web_accessible_resources: [
      {
        resources: ["images/*", "assets/*"],
        matches: [
          "*://*.youtube.com/*",
          "*://*.bilibili.com/*",
          "*://*.nicovideo.jp/*",
        ],
      },
    ],
    action: {
      default_title: "Memeify Thumbnail",
      default_popup: "popup.html",
      default_icon: {
        16: "/icons/16.png",
        32: "/icons/32.png",
        48: "/icons/48.png",
        128: "/icons/128.png",
      },
    },
    options_ui: {
      page: "options.html",
      open_in_tab: true,
    },
    browser_specific_settings: {
      gecko: {
        id: "memeify-thumbnail@kibidango.top",
        strict_min_version: "112.0",
      },
    },
  }),
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  autoIcons: {
    baseIconPath: "icon.svg",
  },
  imports: {
    eslint: {
      enabled: false,
    },
  },
});
