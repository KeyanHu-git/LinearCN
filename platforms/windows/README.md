# LinearCN Windows 桌面安装器

支持 Linear Desktop 1.32.2 及后续具备兼容启动结构的版本。安装后会自动检测 Linear 更新并恢复汉化。

## 安装

完全退出 Linear，双击 `install.cmd`。

## 只检查，不写入

```cmd
install.cmd --dry-run
```

## 回滚

完全退出 Linear 后执行：

双击 `uninstall.cmd`。

安装器会校验路径、Linear 版本和唯一补丁点；任何条件不满足都会停止，不会猜测修改。
