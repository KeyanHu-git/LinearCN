# LinearCN Windows 桌面安装器

安装时检查 Linear 启动结构。维护任务由 Windows 在登录时启动，退出后自动重试；每 15 秒检查一次程序状态。

Linear 更新后，关闭 Linear 即可自动修复。也可打开 `%APPDATA%\Linear\extensions\LinearCN\LinearCN.vbs`，先检查汉化再启动。更新器若已启动新版，当前会话需退出一次。

## 安装

完全退出 Linear，双击 `install.cmd`。

## 只检查，不写入

```cmd
install.cmd --dry-run
```

## 回滚

完全退出 Linear 后执行：

双击 `uninstall.cmd`。

安装状态与原始备份保存在 `%APPDATA%\Linear\extensions\LinearCN`。维护结果见 `maintenance\health.json`。
