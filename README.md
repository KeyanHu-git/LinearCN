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
  <img alt="No telemetry" src="https://img.shields.io/badge/telemetry-none-brightgreen">
</p>

## Linear 的中文界面

LinearCN 不是整页机器翻译器。它使用人工维护的词表和轻量 DOM 规则，只替换 Linear 自己的界面文案，不改写议题标题、评论、代码或其他用户内容。

- 覆盖导航、议题、项目、周期、设置、集成、登录和智能体页面。
- 统一常用术语，例如 `issue → 议题`、`assignee → 负责人`、`triage → 分诊`。
- 支持动态数字、工作区名称、时间文案、弹层和异步加载内容。
- 对发生变化的节点做增量翻译，不反复扫描整页。
- 同一套词表用于浏览器、Userscript 和 Windows 桌面端。
- 通过回归测试与质量审计持续检查漏译、冲突和语义错误。

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

**Chrome / Edge：** 下载并解压 `LinearCN-*-chromium.zip`，打开 `chrome://extensions` 或 `edge://extensions`，开启开发者模式，选择“加载已解压的扩展”，然后刷新 Linear。

**Firefox：** 下载并解压 `LinearCN-*-firefox.zip`，在 `about:debugging#/runtime/this-firefox` 中选择“临时载入附加组件”，打开 `manifest.json`。

**Userscript：** 将 `LinearCN-*.user.js` 导入 Tampermonkey 等用户脚本管理器，然后刷新 Linear。

**Windows 桌面端：** 当前支持 Linear Desktop 1.32.2。完全退出 Linear，在解压后的安装器目录执行：

```powershell
npm install
node install.mjs --app-asar "C:\path\to\Linear\resources\app.asar"
```

**Windows 回滚：** 在安装器目录执行：

```powershell
node install.mjs --uninstall
```

**macOS：** 使用 `LinearCN-*-macOS.zip` 中的浏览器扩展或 Userscript，具体步骤见包内说明。

## 许可证

LinearCN 采用 [GNU GPLv3](LICENSE) 发布。完整许可与版权信息见 [NOTICE.md](NOTICE.md)。
