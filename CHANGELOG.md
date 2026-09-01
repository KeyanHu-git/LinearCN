# Changelog

本项目遵循语义化版本号。

## 1.5.1 - 2026-09-01

### Fixed

- 补齐 Linear 智能体设置页的开关、MCP 连接器、工作区指导和输入提示翻译。
- 修复同一文案因末尾标点不同而无法匹配的问题。
- 修复同时包含 `issues` 与 `questions` 时将“问题”错误覆盖为“议题”的质量规则。

## 1.5.0 - 2026-09-01

### Added

- Chromium、Firefox、Userscript、Windows 和 macOS Web 多端构建。
- Linear 登录、Agent 首页、帮助菜单和动态弹层翻译。
- Windows Electron 独立 WebContents 兜底层。
- 术语和语义质量审计脚本。
- Windows 安装器 dry-run、备份和回滚。

### Changed

- 将 `issue` 统一为“议题”。
- 将 `assignee` 统一为“负责人”。
- 将 `estimate` 统一为“估算”。
- 修正“开放/打开”“归档/删除”等语义错误。
- 优化 MutationObserver 的批处理与候选预筛选，避免高频页面卡顿。

### Security

- 保护编辑器、用户内容和代码区域。
- 保持零网络请求、零遥测和最小作用域。

## 1.4.0 - 2026-09-01

- 全量扫描 32 个设置页面。
- 增加设置、集成、计费、用量和安全页面词条。
- 增加 Unicode 空白归一化和动态规则。

## 1.3.0 - 2026-09-01

- 将 LinearCN 1.2.0 单文件实现重构为分层词表和增量 DOM 引擎。
- 增加代码、用户内容和项目/议题链接保护。
