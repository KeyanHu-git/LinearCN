# Maintenance scripts

本目录保存可重复执行的生成、审计、构建和维护工具。脚本必须使用明确输入与确定性输出，不能静默修改无关文件。

| 文件 | 功能 | 类别 |
| --- | --- | --- |
| `generate-quality-overrides.cjs` | 生成术语与语义质量覆盖层 | generate |
| `extract-legacy-translations.cjs` | 从旧实现提取兼容词表 | maintenance |
| `audit-translations.cjs` | 报告冲突、漂移、极性风险和可疑译文 | audit |
| `crawl-settings-untranslated.mjs` | 从可调试 Linear 会话采集设置页候选文本 | audit |
| `analyze-crawl-report.cjs` | 使用当前翻译引擎过滤采集结果并生成缺失候选 | audit |
| `build-multiplatform.cjs` | 组装 Chromium、Firefox、Userscript、Windows 与 macOS 包 | build |
| `patch-linear-loader-version.cjs` | 将受控桌面加载点升级到当前版本 | maintenance |
| `patch-agent-fallback.cjs` | 为旧桌面补丁增加独立 WebContents 兜底 | maintenance |
| `sync-github-labels.mjs` | 校验并同步仓库标签分类 | maintenance |

推荐顺序：

```text
generate -> test -> audit -> build -> package test
```

生成脚本可以写入声明的产物；审计脚本只写报告；构建脚本只写 `dist/`；维护脚本必须显式接收目标或使用 GitHub Actions 提供的仓库环境。
