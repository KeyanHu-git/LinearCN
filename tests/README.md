# Tests

本目录验证三个层面的契约。

| 文件 | 功能 |
| --- | --- |
| `translation.test.cjs` | 词条优先级、动态规则、关键术语和桌面兜底 |
| `multiplatform.test.cjs` | 多端产物结构、Manifest 差异和安装文件完整性 |
| `repository-structure.test.cjs` | 标签分类、Issue 模板和文档层级 |

新增回归测试应使用真实 UI 原文，并只断言对当前缺陷有解释力的行为。不要把整个词表复制进测试，也不要通过更新快照掩盖语义变化。
