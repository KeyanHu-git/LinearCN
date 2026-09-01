# Repository automation

本目录维护 GitHub 上的协作入口与自动化策略。

| 路径 | 功能 |
| --- | --- |
| `labels.json` | 标签名称、颜色、说明和默认标签别名 |
| `ISSUE_TEMPLATE/` | 漏译、错译、故障和功能建议的结构化入口 |
| `workflows/labels.yml` | 在标签规范变化时同步 GitHub 标签 |
| `workflows/release.yml` | 在推送版本标签时测试、构建并发布多端包 |

## 标签模型

标签使用互不混合的四个工作轴和一个社区轴：

- `type:*`：问题本质，每个 Issue 必须且只能有一个。
- `area:*`：受影响模块，可按跨模块问题添加多个。
- `status:*`：当前处理状态，通常只保留一个。
- `priority:*`：处理顺序，在完成分诊后添加一个。
- `community:*`：面向贡献者的辅助标记。

修改 `labels.json` 后先运行 `npm run labels:check`。同步脚本会创建或更新受管标签，并通过 `aliases` 重命名 GitHub 默认标签；不会删除未列入配置的标签。
