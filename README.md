<p align="center">
  <img src="https://raw.githubusercontent.com/KeyanHu-git/LinearCN/main/img/favicon-128x128.png" width="112" alt="LinearCN">
</p>

<h1 align="center">LinearCN</h1>

<p align="center">让 Linear 更完整、更准确地显示为简体中文。</p>

<p align="center">
  <a href="https://github.com/KeyanHu-git/LinearCN/releases/latest"><strong>下载最新版</strong></a>
</p>

<p align="center">
  <a href="https://github.com/KeyanHu-git/LinearCN/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/KeyanHu-git/LinearCN?display_name=tag&sort=semver"></a>
  <a href="LICENSE"><img alt="GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-blue"></a>
</p>

## 支持平台

| 平台 | 使用方式 |
| --- | --- |
| Chrome、Edge、Brave、Arc、Opera | Chromium 扩展 |
| Firefox 桌面版 | Firefox 扩展 |
| Userscript | 用户脚本管理器 |
| Linear Windows Desktop 1.32.2 | 桌面安装器 |
| macOS | 浏览器扩展或 Userscript |

各平台安装包都在 [Releases](https://github.com/KeyanHu-git/LinearCN/releases/latest)。

## 安装

**Chrome / Edge：** 下载并解压 `LinearCN-*-chromium.zip`，打开 `chrome://extensions` 或 `edge://extensions`，开启开发者模式，选择“加载已解压的扩展”，然后刷新 Linear。

**Firefox：** 下载并解压 `LinearCN-*-firefox.zip`，在 `about:debugging#/runtime/this-firefox` 中选择“临时载入附加组件”，打开 `manifest.json`。

**Userscript：** 将 `LinearCN-*.user.js` 导入 Tampermonkey 等用户脚本管理器，然后刷新 Linear。

**Windows 桌面端：** 当前支持 Linear Desktop 1.32.2。完全退出 Linear，在解压后的安装器目录执行：

```powershell
npm install
node install.mjs --app-asar "C:\path\to\Linear\resources\app.asar"
```

**macOS：** 使用 `LinearCN-*-macOS.zip` 中的浏览器扩展或 Userscript，具体步骤见包内说明。

## 许可证

LinearCN 使用 [GNU GPLv3](LICENSE) 许可证。
