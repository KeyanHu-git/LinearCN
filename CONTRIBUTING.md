# Contributing

感谢您帮助改进 LinearCN Enhanced。

## 报告漏译

请在 Issue 中提供：

- Linear 页面路径或功能入口。
- 未翻译的英文原文。
- 不包含敏感信息的截图。
- 使用环境：Web/Windows、浏览器及扩展版本。

## 报告错译

请提供：

- 英文原文。
- 当前中文译文。
- 建议译文。
- 说明具体语境和修改理由。

## 核心术语

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

不要把产品对象 `issue` 翻译成普通“问题”。品牌名、API、代码、快捷键和用户自定义内容通常保持原文。

## 修改位置

- 新功能和弹层：`js/translations-enhanced.js`
- 设置和集成：`js/translations-settings.js`
- 人工质量修正：修改 `scripts/generate-quality-overrides.cjs`，然后重新生成 `js/translations-quality.js`
- 旧版兼容词表：不要直接修改 `js/translations-base.js`

## 提交前检查

```bash
node scripts/generate-quality-overrides.cjs
node tests/translation.test.cjs
node scripts/audit-translations.cjs
node scripts/build-multiplatform.cjs
node tests/multiplatform.test.cjs
```

不得提交账号信息、真实工作区数据、Cookie、令牌、私钥、签名文件或 Linear 官方 `app.asar`。
