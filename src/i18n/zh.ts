import type { TranslationKeys } from "./en";

export const zh: TranslationKeys = {
  extName: "Memeify 缩略图",
  extDescription: "在 YouTube、Bilibili、Niconico 上用角色包（CHR-pack）替换视频缩略图。",

  options: {
    title: "Memeify 缩略图设置",
    general: "通用",
    appearance: "外观",
    packs: "角色包",
    platforms: "平台",
    about: "关于",

    enableExtension: "启用扩展",
    enableExtensionDesc: "全局启用或禁用缩略图替换",
    activePack: "当前角色包",
    activePackDesc: "选择在所有平台上使用的角色包",
    noPack: "尚未安装任何角色包。请从下方安装。",

    theme: "主题",
    themeLight: "浅色",
    themeDark: "深色",
    themeAuto: "跟随系统",
    locale: "语言",

    installPack: "安装角色包",
    installPackDesc: "粘贴角色包（CHR-pack）zip 文件的下载链接",
    installFromUrl: "从 URL 安装",
    installFromFile: "从文件安装",
    packUrlPlaceholder: "https://github.com/.../pack.zip",
    installing: "正在安装...",
    installed: "已安装",
    installError: "安装失败",
    uninstall: "卸载",
    checkUpdates: "检查更新",
    updateAvailable: "有可用更新",
    upToDate: "已是最新",
    packName: "名称",
    packVersion: "版本",
    packAuthor: "作者",
    packDescription: "描述",
    packImages: "图片",
    imagesCount: "{count} 张图片",

    platformYoutube: "YouTube",
    platformBilibili: "哔哩哔哩",
    platformNiconico: "Niconico",
    enablePlatform: "在 {platform} 上启用",
    platformPackOverride: "平台包覆盖",
    platformPackOverrideDesc: "为此平台使用不同的角色包（留空则使用全局包）",

    version: "版本",
    projectUrl: "项目地址",
    reportIssue: "报告问题",
    credits: "致谢",
    license: "许可证",
  },

  popup: {
    title: "Memeify",
    enabled: "已启用",
    disabled: "已禁用",
    openOptions: "打开设置",
    currentPack: "当前角色包",
    noPack: "无角色包",
    quickToggle: "在此网站切换",
  },

  content: {
    replaced: "缩略图已被 Memeify 替换",
    packLoadError: "加载角色包失败",
  },
};
