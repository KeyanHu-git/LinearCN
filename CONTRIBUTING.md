# Contributing

LinearCN 接受漏译、错译、运行故障和平台改进。先提交能够复现问题的最小证据，再讨论实现。

## 提交 Issue

请使用对应模板，并确保截图不包含账号、工作区数据、Cookie、令牌或私钥。

- 漏译：页面入口、英文原文、平台和截图。
- 错译：英文原文、当前译文、建议译文及语境。
- 故障：实际表现、复现步骤和完整版本信息。
- 建议：当前问题、期望行为和不应改变的边界。

标签按四个轴分工：`type:*` 表示问题本质，`area:*` 表示影响范围，`status:*` 表示处理阶段，`priority:*` 表示顺序。完整定义见 [`.github/labels.json`](.github/labels.json)。

## 术语基线

| English | 中文 |
| --- | --- |
| issue | 议题 |
| project | 项目 |
| cycle | 周期 |
| backlog | 积压事项 |
| triage | 分诊 |
| assignee | 负责人 |
| estimate | 估算 |
| initiative | 倡议 |
| milestone | 里程碑 |
| agent | 智能体 |
| workspace | 工作区 |

品牌名、API、代码、快捷键和用户自定义内容通常保持原文。`issue` 作为 Linear 对象时译为“议题”，普通疑问仍译为“问题”。

## 修改入口

| 变更 | 文件 |
| --- | --- |
| 常规页面和弹层 | `js/translations-enhanced.js` |
| 设置、集成、登录和管理页面 | `js/translations-settings.js` |
| 术语与语义修正 | `scripts/generate-quality-overrides.cjs` |
| DOM 匹配或保护边界 | `js/content.js` |
| 平台安装与交付 | `platforms/` |
| 构建、审计和维护工具 | `scripts/` |

不要直接修改 `translations-base.js`、`translations-quality.js`、`dist/` 或 `audits/`。这些内容由脚本生成。

## 注释规则

- 注释解释约束、原因、失败策略和跨模块契约。
- 不复述函数名、赋值或循环本身。
- 文件头说明模块边界；复杂分支只说明为什么需要该分支。
- 文件说明只写功能，不标记“新增”“旧版”“原有”等变更状态。
- 保留第三方版权和许可证注释，不把来源说明改写成作者声明。

项目依赖关系和不变量见 [ARCHITECTURE.md](ARCHITECTURE.md)。一级目录的直接文件说明位于各目录 `README.md`。

## 提交前检查

```bash
npm run generate
npm test
npm run labels:check
npm run audit
npm run build
npm run test:packages
```

生成步骤执行后必须检查 `git diff`，确认只出现预期的词表、文档或版本变化。
