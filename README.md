<p align="center">
  <img src="img/linearcn-icon.png" width="112" height="112" alt="LinearCN">
</p>

<h1 align="center">LinearCN</h1>

<p align="center">让 Linear 更完整、更准确地显示为简体中文。</p>

<p align="center">
  <a href="https://github.com/KeyanHu-git/LinearCN/releases/latest"><strong>下载最新版</strong></a>
  · <a href="https://github.com/KeyanHu-git/LinearCN/issues">反馈漏译</a>
  · <a href="CONTRIBUTING.md">参与校对</a>
</p>

<p align="center">
  <a href="https://github.com/KeyanHu-git/LinearCN/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/KeyanHu-git/LinearCN?display_name=tag&sort=semver"></a>
  <a href="LICENSE"><img alt="GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-blue"></a>
  <img alt="No telemetry" src="https://img.shields.io/badge/telemetry-none-brightgreen">
</p>

> [!IMPORTANT]
> LinearCN 是非官方社区项目，与 Linear Orbit, Inc. 无隶属或合作关系。

## 它做什么

LinearCN 使用本地词表和轻量 DOM 规则翻译 Linear 界面。它不调用翻译 API，不上传页面内容，也不会改写议题标题、评论、代码或其他用户输入。

- 覆盖导航、议题、项目、周期、设置、集成、登录和智能体页面。
- 统一常用术语，例如 `issue → 议题`、`assignee → 负责人`。
- 跟随动态界面更新，只处理发生变化的节点。
- 同一套词表用于浏览器、Userscript 和 Windows 桌面端。

## 支持平台

| 平台 | 状态 |
| --- | --- |
| Chrome、Edge、Brave、Arc、Opera | 支持 |
| Firefox 桌面版 | 支持 |
| Userscript | 支持 |
| Linear Windows Desktop 1.32.2 | 已验证 |
| macOS 浏览器方案 | 实验性 |

各平台安装包都在 [Releases](https://github.com/KeyanHu-git/LinearCN/releases/latest)。

## 安装

### Chrome / Edge

1. 下载并解压 `LinearCN-Enhanced-*-chromium.zip`。
2. 打开 `chrome://extensions` 或 `edge://extensions`。
3. 开启开发者模式，选择“加载已解压的扩展”。
4. 刷新 Linear。

### Firefox

解压 Firefox 安装包，在 `about:debugging#/runtime/this-firefox` 中选择“临时载入附加组件”，然后打开 `manifest.json`。

### Windows 桌面端

安装器目前只支持 Linear Desktop 1.32.2。完全退出 Linear 后，在解压目录执行：

```powershell
npm install
node install.mjs --app-asar "C:\path\to\Linear\resources\app.asar"
```

回滚时执行：

```powershell
node install.mjs --uninstall
```

Userscript 与 macOS 的说明随对应安装包提供。完整兼容范围见 [MULTIPLATFORM.md](MULTIPLATFORM.md)。

## 隐私

LinearCN 没有遥测、广告、远程代码或网络请求。翻译在本机完成。详见 [PRIVACY.md](PRIVACY.md)。

## 开发

需要 Node.js 22 或更高版本：

```bash
npm run generate
npm test
npm run audit
npm run build
npm run test:packages
```

发现漏译或错译时，请附上页面位置、英文原文和截图。提交代码前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

LinearCN 采用 [GNU GPLv3](LICENSE) 发布。完整许可与版权信息见 [NOTICE.md](NOTICE.md)。
