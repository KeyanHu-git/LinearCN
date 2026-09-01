# 多端支持

LinearCN Enhanced 使用同一套词表和 DOM 翻译引擎，通过不同运行壳适配多个终端。

| 终端 | 交付方式 | 状态 |
| --- | --- | --- |
| Chrome、Edge、Brave、Arc、Opera | Chromium Manifest V3 扩展 | 支持 |
| Firefox 桌面版 | Firefox Manifest V3 扩展 | 支持 |
| Firefox Android 网页版 | Firefox 扩展 | 实验性；不等同于 Linear 原生 Android 应用 |
| Safari、其他支持用户脚本的浏览器 | Userscript | 实验性，需要用户脚本管理器 |
| Linear Windows 桌面端 | Electron 本地安装器 | 已在 Linear 1.32.2 验证 |
| Linear macOS 桌面端 | 不修改官方应用 | 不提供；修改应用包会破坏代码签名，建议使用 Web 端 |
| Linear iOS/Android 原生应用 | 无安全注入点 | 不支持；需要 Linear 官方提供本地化 |

## 设计边界

- 所有端共用 `translations-base.js`、`translations-enhanced.js`、`translations-settings.js`、`translations-quality.js` 和 `content.js`。
- 浏览器扩展与用户脚本不包含桌面端 `agent-fallback.js`；该文件只处理 Electron 独立 WebContents。
- 不请求通用浏览权限，不联网，不读取或上传用户数据。
- Windows 安装器仅修改本机已有的 Linear `app.asar`，不分发任何 Linear 官方代码，并保留可恢复备份。
- Windows 安装器对未知 Linear 版本失败关闭，不尝试模糊修改。

## 发布建议

- Chromium 包可提交 Chrome Web Store 和 Microsoft Edge Add-ons。
- Firefox 包可提交 addons.mozilla.org；Manifest 已声明不收集数据。
- Userscript 可发布到 GitHub Releases 或用户脚本站点。
- Windows 桌面安装器适合放在 GitHub Releases，并明确支持的 Linear 版本。
