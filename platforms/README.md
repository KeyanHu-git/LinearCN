# Platform adapters

本目录负责把同一套核心运行时交付到不同平台。平台适配只能处理安装、加载、签名和兼容性，不复制翻译业务逻辑。

| 路径 | 功能 |
| --- | --- |
| `windows/install.mjs` | 校验 Linear 版本、备份并修补 `app.asar`、安装运行时和执行回滚 |
| `windows/archive.mjs` | 程序包快照、备份校验、事务切换和中断恢复 |
| `windows/repair.mjs` | 运行状态检查、退出后修复和检查后启动 |
| `windows/register-maintenance.ps1` | 注册、停用 Windows 维护任务 |
| `windows/package.json` | 声明 Windows 安装器运行依赖 |
| `windows/README.md` | Windows 交付包内的安装说明 |
| `macos/README-macOS.md` | macOS 浏览器方案与代码签名边界说明 |

Windows 修改未知构建时必须停止，不猜测补丁位置。macOS 不修改官方签名应用，除非未来具备可验证、可恢复且不破坏签名的正式方案。
