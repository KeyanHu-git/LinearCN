# LinearCN for macOS

本包面向 macOS Web 端，不修改已签名的官方 `Linear.app`。

## 推荐顺序

### 1. Chrome、Arc、Brave、Edge

1. 解压 `chromium` 文件夹。
2. 打开浏览器扩展管理页。
3. 开启开发者模式。
4. 选择“加载已解压的扩展”，指向 `chromium` 文件夹。
5. 打开或刷新 `https://linear.app`。

### 2. Firefox

开发测试时，在 `about:debugging#/runtime/this-firefox` 中选择“临时载入附加组件”，再选择 `firefox/manifest.json`。

正式长期安装应发布到 addons.mozilla.org 并完成签名。

### 3. Safari 临时扩展

Safari 17 及以后：

1. 打开 Safari → 设置 → 高级，启用“显示 Web 开发者功能”。
2. 打开 Safari → 设置 → 开发者，允许未签名扩展。
3. 点击“添加临时扩展”，选择 `safari-webextension` 文件夹或其 ZIP。
4. 在扩展页启用 LinearCN，并允许访问 `linear.app`。

Safari 会在退出浏览器或 24 小时后移除临时扩展。

### 4. Safari 永久扩展

需要 macOS、Xcode 和签名身份。在终端进入本目录后运行：

```zsh
xcrun safari-web-extension-converter safari-webextension
```

然后在生成的 Xcode 项目中选择开发团队并构建。公开分发需要 Apple Developer Program 和 App Store/Developer ID 流程。

### 5. Userscript

如果浏览器装有兼容的用户脚本管理器，可直接导入 `LinearCN.user.js`。

## 原生 Linear.app

不提供直接修改 macOS `Linear.app/Contents/Resources/app.asar` 的脚本。修改已签名应用会破坏官方签名，并可能影响 Gatekeeper、自动更新和完整性验证。请使用上述 Web 端方案。

## 隐私

扩展只在 `linear.app` 页面本地替换界面文字，不进行网络请求，不收集或上传数据。
