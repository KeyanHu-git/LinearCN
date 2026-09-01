<p align="center">
  <img src="https://raw.githubusercontent.com/KeyanHu-git/LinearCN/main/img/favicon-128x128.png" width="112" alt="LinearCN">
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

## Linear 的中文界面

LinearCN 不是整页机器翻译器。它使用人工维护的词表和轻量 DOM 规则，只替换 Linear 自己的界面文案，不改写议题标题、评论、代码或其他用户内容。

- 覆盖导航、议题、项目、周期、设置、集成、登录和智能体页面。
- 统一常用术语，例如 `issue → 议题`、`assignee → 负责人`、`triage → 分诊`。
- 支持动态数字、工作区名称、时间文案、弹层和异步加载内容。
- 对发生变化的节点做增量翻译，不反复扫描整页。
- 同一套词表用于浏览器、Userscript 和 Windows 桌面端。
- 通过回归测试与质量审计持续检查漏译、冲突和语义错误。

## 当前覆盖

| 区域 | 已覆盖内容 |
| --- | --- |
| 日常协作 | 导航、议题、积压事项、分诊、周期、通知 |
| 项目管理 | 项目、倡议、里程碑、模板、状态、更新 |
| 工作区管理 | 成员、团队、安全、计费、用量、导入导出 |
| AI 与智能体 | Linear Agent、智能体个性化、MCP、工作区指导 |
| 连接与扩展 | 集成、API、OAuth、应用目录与帮助菜单 |

Linear 更新很快，个别新页面仍可能出现英文。发现后可以直接提交[漏译报告](https://github.com/KeyanHu-git/LinearCN/issues/new?template=missing-translation.yml)。

## 下载哪个文件

| 文件 | 用途 |
| --- | --- |
| `*-chromium.zip` | Chrome、Edge、Brave、Arc、Opera |
| `*-firefox.zip` | Firefox 桌面版 |
| `*.user.js` | Tampermonkey 等用户脚本管理器 |
| `*-windows-desktop-installer.zip` | Linear Windows 桌面端 |
| `*-macOS.zip` | macOS 浏览器与 Userscript 方案 |

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

## 它怎样工作

```text
兼容词表 + 当前词表 + 设置词表 + 质量覆盖层
                    ↓
        精确匹配 / 空白归一化 / 动态规则
                    ↓
          MutationObserver 增量更新
                    ↓
          浏览器扩展 / Userscript / 桌面端
```

运行时完全由 JavaScript 组成，不需要 Python，也不连接在线翻译服务。词表层、DOM 引擎、平台适配和构建工具相互独立，详细设计见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 隐私

LinearCN 没有遥测、广告、远程代码或网络请求。翻译在本机完成。详见 [PRIVACY.md](PRIVACY.md)。

翻译引擎会主动跳过输入框、编辑器、代码块、议题标题、项目名称和评论。Windows 安装器只修改本机已有的 Linear，并在写入前创建可恢复备份。

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

项目分层、依赖边界和文件职责见 [ARCHITECTURE.md](ARCHITECTURE.md)。目录说明、注释规则和标签规范都已纳入自动测试。

## 参与维护

- 漏译：提供页面入口、英文原文、平台和截图。
- 错译：同时提供当前译文、建议译文和具体语境。
- 代码变更：先确认应修改的词表层，再运行生成、测试、审计和构建。

完整流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

LinearCN 采用 [GNU GPLv3](LICENSE) 发布。完整许可与版权信息见 [NOTICE.md](NOTICE.md)。
