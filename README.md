# Memeify Thumbnail

> Replace video thumbnails with character images from CHR-packs on **YouTube**, **Bilibili**, and **Niconico**.

- ⚡ **Fast & lightweight** — built with Bun + WXT + TypeScript

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development mode (auto-reload)
npm run dev

# Build for Chrome
npm run build:chrome

# Build for Firefox
npm run build:firefox

# Build and zip for distribution
npm run zip
```

## 🎭 CHR-pack

A **CHR-pack** (Character Pack) is a zip file containing:

```
pack/
├── manifest.json        # Character metadata
├── icon.png             # Pack icon (optional)
└── images/
    ├── 1.png            # Image files (numbered)
    ├── 2.png
    └── ...
```

See: [CHR-pack-example](https://github.com/Memeify-Thumbnail/CHR-pack-example)

### manifest.json

```json
{
  "character_name": "Example",
  "description": "Example character pack for thumbnail replacement",
  "version": "1.0.0",
  "icon": "icon.png",
  "author": "Memeify-Thumbnail",
  "version_check_url": "https://api.github.com/repos/.../releases/latest",
  "update_url": "https://github.com/.../releases/download/v1.0.0/pack.zip",
  "localizations": {
    "zh": {
      "description": "示例角色，用于缩略图替换的角色包"
    }
  }
}
```

## 🔧 Development

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build for Chrome |
| `npm run build:firefox` | Build for Firefox |
| `npm run zip` | Create distribution ZIP |

### Adding a new platform

1. Create `src/platforms/newplatform.ts`
2. Export: `detectNewPlatform()`, `findNewVideos()`, observer config
3. Register in `src/entrypoints/content.ts`
4. Add matches to the `defineContentScript` call
5. Add host_permission and web_accessible_resources in `wxt.config.ts`
6. Add platform config in `src/core/types.ts`
7. Add i18n strings in `src/i18n/en.ts` and `src/i18n/zh.ts`
8. Add platform card in `src/entrypoints/options/App.tsx`

## 🚀 自动发布

推送 tag 即可触发 GitHub Actions 自动构建和发布：

```bash
git tag v1.0.0
git push origin v1.0.0
```

### GitHub Secrets 设置

前往仓库 Settings → Secrets and variables → Actions，添加：

| Secret | 值 |
|--------|-----|
| `CRX_PRIVATE_KEY` | Chrome CRX 签名私钥（base64 编码） |

首次使用前，生成签名密钥并添加为 Secret：

```bash
# 生成密钥
openssl genrsa -out memeify-crx-key.pem 2048
# Base64 编码
base64 -w0 memeify-crx-key.pem
# 复制输出内容，添加到 GitHub Secrets 的 CRX_PRIVATE_KEY
```

### 发布产物

每次发布包含三个文件：

| 文件 | 说明 |
|------|------|
| `memeify-thumbnail-chrome.crx` | Chrome 扩展（已签名） |
| `memeify-thumbnail-chrome.zip` | Chrome 扩展 ZIP（用于 Chrome Web Store 上传） |
| `memeify-thumbnail-firefox.xpi` | Firefox 扩展 |

## 📄 License

MIT

## 🙏 Credits

- [HajimariUI](https://kibidango.top) — Theme inspiration
- [WXT](https://wxt.dev) — Extension framework
- [shadcn/ui](https://ui.shadcn.com) — UI component patterns
- [MrBeastify-Youtube](https://github.com/MagicJinn/MrBeastify-Youtube) — Original concept
