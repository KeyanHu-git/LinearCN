# Runtime and dictionaries

本目录是项目的核心层。平台包只能加载这里的文件，不维护自己的词表副本。

| 文件 | 功能 | 维护方式 |
| --- | --- | --- |
| `translations-base.js` | 旧版兼容词表 | 由提取脚本生成，不直接编辑 |
| `translations-enhanced.js` | 当前常规界面和动态规则 | 人工维护 |
| `translations-settings.js` | 设置、集成、登录和管理页面 | 人工维护 |
| `translations-settings-nested.js` | 二级设置页、详情页和深层配置 | 人工维护 |
| `translations-integrations.js` | 集成详情页和连接说明 | 人工维护 |
| `translations-quality.js` | 术语统一和人工审校覆盖层 | 由质量生成脚本生成 |
| `content.js` | DOM 翻译、属性翻译、内容保护和增量调度 | 人工维护 |
| `agent-fallback.js` | Windows 独立 WebContents 的有限兜底 | 人工维护，限制词条范围 |
| `content.legacy.js` | 旧实现快照与词表提取输入 | 只读，不参与运行时 |

## 合并顺序

```text
base -> enhanced -> settings -> nested settings -> integrations -> quality
```

相同英文键由右侧层覆盖。普通新增词条不应进入 `quality`；只有明确的术语或语义修正才进入其生成脚本。

## 内容保护

翻译引擎必须跳过输入框、富文本编辑器、代码区、议题链接、项目链接和用户生成内容。新增选择器前先证明它是稳定的界面边界，不能用宽泛类名替代语义判断。
