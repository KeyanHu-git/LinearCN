# Security policy

## Supported version

当前仅维护最新发布版本。

## Reporting a vulnerability

请不要公开发布可能暴露用户数据、认证信息或代码执行风险的漏洞细节。优先使用 GitHub 的私密漏洞报告功能；如果该功能尚未启用，请先创建不包含利用细节的普通 Issue 请求联系维护者。

报告应包括受影响版本、环境、复现条件和风险说明。请勿包含真实账号、Cookie、令牌或工作区数据。

## Security design

- 不联网，不执行远程代码。
- 不读取认证数据。
- 内容脚本仅匹配 Linear 域名。
- Windows 安装器只支持明确版本，补丁点不唯一时失败关闭。
- 不分发 Linear 官方程序或修改后的 `app.asar`。
