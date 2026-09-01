# LinearCN Enhanced Windows 桌面安装器

仅支持 Linear Desktop 1.32.2。安装器不会携带或分发 Linear 官方程序，只在本机解包并修改现有 `app.asar`。

## 安装

1. 完全退出 Linear。
2. 安装 Node.js 22.12 或更高版本。
3. 在本目录执行 `npm install`。
4. 执行：

   ```powershell
   node install.mjs --app-asar "C:\path\to\Linear\resources\app.asar"
   ```

如果 Linear 安装在默认目录，可以省略 `--app-asar` 让安装器自动查找。

## 只检查，不写入

```powershell
node install.mjs --dry-run --app-asar "C:\path\to\Linear\resources\app.asar"
```

## 回滚

完全退出 Linear 后执行：

```powershell
node install.mjs --uninstall
```

安装器会校验路径、Linear 版本和唯一补丁点；任何条件不满足都会停止，不会猜测修改。
