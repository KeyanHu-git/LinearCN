<p align="center">
  <img src="img/favicon-128x128.png" width="96" height="96" alt="LinearCN Enhanced">
</p>

<h1 align="center">LinearCN Enhanced</h1>

<p align="center">
  让 Linear 的界面更完整、更准确地显示为简体中文。
</p>

<p align="center">
  <a href="https://github.com/KeyanHu-git/LinearCN/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/KeyanHu-git/LinearCN?display_name=tag&sort=semver"></a>
  <a href="LICENSE"><img alt="GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-blue"></a>
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-green">
  <img alt="No telemetry" src="https://img.shields.io/badge/telemetry-none-brightgreen">
</p>

<p align="center">
  <a href="#安装">安装</a> ·
  <a href="#功能特性">功能</a> ·
  <a href="#兼容环境">兼容性</a> ·
  <a href="#参与贡献">贡献</a> ·
  <a href="#许可证与致谢">许可证</a>
</p>

> [!IMPORTANT]
> 本项目是非官方社区汉化，与 Linear Orbit, Inc. 无隶属、授权或合作关系。Linear 名称和标志归其权利人所有。

## 项目简介

LinearCN Enhanced 是面向新版 [Linear](https://linear.app/) 的规则型简体中文本地化项目。它不调用 AI 翻译、不连接翻译服务器，而是在本地使用经过校对的词表、动态规则和增量 DOM 引擎替换界面文案。

项目基于 Darwin 发布的 LinearCN 1.2.0 继续开发，在保留原词表的基础上重构了翻译引擎，并增加质量覆盖层、独立 WebContents 适配、全设置页扫描和多端构建。

## 功能特性

- 覆盖导航、议题、项目、周期、分诊、积压事项、设置、集成、登录和 Agent 页面。
- 使用统一术语：`issue → 议题`、`assignee → 负责人`、`estimate → 估算`。
- 支持动态数字、工作区名称、时间文案和 Unicode 空白差异。
- 仅处理发生变化的 DOM 节点，避免每次更新扫描整页。
- 保护用户输入、议题标题、项目名称、评论、代码和编辑器内容。
- 为 Linear Windows 桌面端的独立 Electron WebContents 提供低开销兜底翻译。
- Chromium、Firefox、Userscript、Windows 桌面和 macOS Web 共用同一套词表。
- 无遥测、无广告、无远程代码、无网络请求。

## 兼容环境

| 平台 | 方式 | 状态 |
| --- | --- | --- |
| Chrome、Edge、Brave、Arc、Opera | Chromium Manifest V3 | 支持 |
| Firefox 桌面版 | Firefox Manifest V3 | 支持 |
| Firefox Android 网页版 | Firefox 扩展 | 实验性 |
| Safari、其他兼容浏览器 | Userscript / Safari Web Extension | 实验性 |
| Linear Windows 桌面端 1.32.2 | Electron 本地安装器 | 已验证 |
| Linear macOS 桌面端 | 使用 Web 端方案 | 不修改官方签名应用 |
| Linear iOS/Android 原生应用 | — | 不支持 |

更完整的边界说明见 [MULTIPLATFORM.md](MULTIPLATFORM.md)。

## 安装

请先从 [Releases](https://github.com/KeyanHu-git/LinearCN/releases) 下载对应平台文件。

### Chromium：Chrome / Edge / Brave / Arc / Opera

1. 下载 `LinearCN-Enhanced-*-chromium.zip` 并解压。
2. 打开浏览器扩展管理页：
   - Chrome：`chrome://extensions`
   - Edge：`edge://extensions`
3. 开启“开发者模式”。
4. 选择“加载已解压的扩展”，指向解压目录。
5. 打开或刷新 `https://linear.app`。

### Firefox

1. 下载并解压 `LinearCN-Enhanced-*-firefox.zip`。
2. 打开 `about:debugging#/runtime/this-firefox`。
3. 选择“临时载入附加组件”。
4. 选择解压目录中的 `manifest.json`。

临时附加组件会在 Firefox 重启后移除；长期安装需要在 addons.mozilla.org 完成签名发布。

### Userscript

1. 安装兼容的用户脚本管理器。
2. 导入 Release 中的 `LinearCN-Enhanced-*.user.js`。
3. 打开或刷新 Linear Web。

Userscript 仅匹配 `linear.app` 及其子域名。

### Windows 桌面端

> [!WARNING]
> 当前安装器只支持 Linear Desktop 1.32.2。请先完全退出 Linear，并保留安装器生成的备份。

1. 下载并解压 `LinearCN-Enhanced-*-windows-desktop-installer.zip`。
2. 安装 Node.js 22.12 或更高版本。
3. 在安装器目录运行：

   ```powershell
   npm install
   node install.mjs --app-asar "C:\path\to\Linear\resources\app.asar"
   ```

4. 重新启动 Linear。

只检查兼容性、不写入：

```powershell
node install.mjs --dry-run --app-asar "C:\path\to\Linear\resources\app.asar"
```

回滚：

```powershell
node install.mjs --uninstall
```

### macOS

下载 `LinearCN-Enhanced-*-macOS.zip`。包内提供 Chromium、Firefox、Safari 临时扩展和 Userscript，详细步骤见其中的 `README-macOS.md`。

项目不直接修改 `Linear.app/Contents/Resources/app.asar`，因为这会破坏官方代码签名，并可能影响 Gatekeeper 和自动更新。

## 工作原理

它不是 Python 程序，也不是 AI 翻译服务。核心由 JavaScript 组成：

```text
词表与质量覆盖层
        ↓
精确匹配、空白归一化和动态规则
        ↓
MutationObserver 增量监听
        ↓
只替换 Linear 的界面文本与无障碍属性
```

主要文件：

| 文件 | 作用 |
| --- | --- |
| `js/translations-base.js` | LinearCN 1.2.0 去重后的兼容词表 |
| `js/translations-enhanced.js` | 新界面和动态功能词条 |
| `js/translations-settings.js` | 设置、集成和登录页面词条 |
| `js/translations-quality.js` | 术语统一和人工校对覆盖层 |
| `js/content.js` | 浏览器 DOM 翻译引擎 |
| `js/agent-fallback.js` | Windows 桌面独立 WebContents 兜底层 |

## 隐私

LinearCN Enhanced：

- 不收集、存储或上传任何用户数据。
- 不读取账号密码、令牌、议题内容或评论。
- 不进行网络请求。
- 不包含遥测、分析、广告或远程执行代码。
- 只在 `linear.app` 页面本地修改界面显示。

详见 [PRIVACY.md](PRIVACY.md)。

## 开发与测试

需要 Node.js 22 或更高版本。核心测试和构建只依赖 Node.js 内置模块：

```bash
node scripts/generate-quality-overrides.cjs
node tests/translation.test.cjs
node scripts/audit-translations.cjs
node scripts/build-multiplatform.cjs
node tests/multiplatform.test.cjs
```

构建结果位于 `dist/<version>/`。

## 参与贡献

欢迎提交 Issue 或 Pull Request：

1. 漏译页面请提供页面路径、英文原文和截图。
2. 错译请说明当前译文、建议译文和语境。
3. 新词条优先加入对应的维护文件，不直接编辑生成文件。
4. 保持核心术语一致，参见 [CONTRIBUTING.md](CONTRIBUTING.md)。
5. 提交前运行全部测试和质量审计。

## 路线图

- [ ] 持续跟进 Linear UI 更新。
- [ ] 增加更多弹层、命令菜单和异常页面扫描。
- [ ] 完善 Firefox 与 Safari 实机回归。
- [ ] 建立 Chrome Web Store、Edge Add-ons 和 Firefox Add-ons 发布流程。
- [ ] 维护术语表和翻译质量基线。

## 许可证与致谢

本项目采用 [GNU GPLv3](LICENSE) 发布。

- 原始项目：LinearCN 1.2.0
- 原作者：Darwin
- 原扩展：[Chrome Web Store](https://chromewebstore.google.com/detail/linearcn/iadjepkibljfmgjomobigajcegclfedc)
- 增强版维护：KeyanHu-git 与社区贡献者

感谢原作者提供初始词表与实现。增强版保留 GPLv3，并公开完整对应源码。详细归属见 [NOTICE.md](NOTICE.md)。

---

如果这个项目对您有帮助，欢迎 Star、提交漏译或参与校对。
