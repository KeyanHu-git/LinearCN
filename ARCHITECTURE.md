# Architecture

LinearCN 将“翻译内容”“运行时引擎”“平台交付”和“维护工具”分开。新增平台只能复用核心层，不在平台目录复制词表或实现第二套翻译逻辑。

## 数据流

```text
旧版兼容词表 ─┐
当前界面词表 ─┼─> 分层合并 ─> 精确/归一化/动态匹配 ─> DOM 增量更新
设置页词表 ───┤                                      │
质量覆盖层 ───┘                                      ├─> 浏览器扩展 / Userscript
                                                     └─> Windows WebContents 兜底
```

词表优先级固定为：`base < enhanced < settings < nested settings < integrations < quality`。后层可以纠正前层，但不得把用户内容纳入通用替换。

## 一级目录职责

| 目录 | 职责 |
| --- | --- |
| `.github/` | Issue 入口、标签规范和仓库自动化 |
| `img/` | 项目主图与扩展所需尺寸资源 |
| `js/` | 运行时引擎、分层词表和桌面兜底 |
| `platforms/` | 平台安装壳与平台说明，不承载翻译业务逻辑 |
| `scripts/` | 生成、审计、构建、迁移和仓库维护工具 |
| `tests/` | 翻译语义、多端产物和仓库结构契约 |

每个一级目录的 `README.md` 只说明该目录职责和直接文件。`.github/` 使用 `AUTOMATION.md`，避免 GitHub 将它误判为仓库首页并覆盖根 README。更深目录仅在交付本身需要时保留使用说明。

## 模块边界

### 核心运行时

`js/content.js` 只负责加载词表、匹配文本、保护用户内容和增量更新 DOM。它不包含平台检测、安装逻辑或网络请求。

### 翻译数据

可维护词条进入 `translations-enhanced.js` 或 `translations-settings.js`。术语修正写入生成脚本，再生成 `translations-quality.js`。兼容词表和质量覆盖层不直接手改。

### 平台适配

浏览器直接加载核心运行时。Userscript 由构建脚本拼接同一组文件。Windows 安装器和维护程序共用 `archive.mjs` 的安装事务；检查程序身份、版本下限及唯一启动补丁点。原始备份、待完成事务和安装状态保存在用户目录。Windows 计划任务负责维护程序的登录启动和退出恢复；维护程序在 Linear 关闭时修复，启动入口在修复后打开 Linear。

### 工具链

脚本分为四类：

- `generate`：从可维护输入生成确定性文件。
- `audit`：报告冲突、术语漂移和潜在误译，不修改输入。
- `build`：复制和组合已验证源码，不产生新的翻译规则。
- `maintenance`：迁移旧数据、同步标签或修补受控安装点。

## 不变量

1. 不翻译输入框、编辑器、代码、议题标题、项目名称和评论。
2. 不发送网络请求，不加载远程代码，不收集遥测。
3. 所有平台共用同一组词表和 `content.js`。
4. 生成文件由脚本负责，人工修改必须进入其上游来源。
5. 桌面安装器必须校验版本、唯一补丁点、备份位置和回滚状态。
6. GitHub 标签、Issue 模板和贡献文档使用同一套分类名称。

## 修改路径

| 变更 | 入口 | 必须验证 |
| --- | --- | --- |
| 普通界面漏译 | `js/translations-enhanced.js` | `npm test` |
| 设置、集成或登录页漏译 | `js/translations-settings.js` | `npm test` |
| 术语或语义修正 | `scripts/generate-quality-overrides.cjs` | `npm run generate && npm test` |
| DOM 匹配行为 | `js/content.js` | 翻译测试与内容保护测试 |
| 平台交付 | `platforms/`、`scripts/build-multiplatform.cjs` | `npm run build && npm run test:packages` |
| 仓库标签 | `.github/labels.json` | `npm run labels:check` |

## 发布门槛

正式标签必须对应通过以下命令的提交：

```bash
npm run generate
npm test
npm run test:desktop
npm run audit
npm run build
npm run test:packages
```

桌面事务测试需要先执行 `npm ci --prefix platforms/windows --ignore-scripts`。每次发布使用新的补丁版本，标签与安装包版本一致；已发布的附件不再被其他提交覆盖。
