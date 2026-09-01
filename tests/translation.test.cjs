/** Semantic regression tests for dictionary precedence and runtime matching. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({
  globalThis: {},
  console,
  requestAnimationFrame: callback => callback()
});

for (const file of ["translations-base.js", "translations-enhanced.js", "translations-settings.js", "translations-quality.js", "content.js"]) {
  const source = fs.readFileSync(path.join(root, "js", file), "utf8");
  vm.runInContext(source, context, { filename: file });
}

const translate = context.globalThis.LinearCNEngine.translateString;

assert.equal(translate("Display options"), "显示选项");
assert.equal(translate("  Add filter  "), "  添加筛选器  ");
assert.equal(translate("3 issues"), "3 个议题");
assert.equal(translate("Created yesterday"), "创建于 yesterday");
assert.equal(translate("Invite to KeyanHu…"), "邀请加入 KeyanHu……");
assert.equal(translate("A user-authored issue title"), "A user-authored issue title");
assert.equal(translate("Leave a comment…"), "发表评论……");
assert.equal(translate("$12.50 remaining"), "剩余 $12.50");
assert.equal(translate("Navigated to AI & Agents"), "已导航至 AI 与智能体");
assert.equal(translate("Navigated to Import & export"), "已导航至 导入与导出");
assert.equal(translate("CLI import"), "CLI 导入");
assert.equal(translate("Issue data"), "议题数据");
assert.equal(translate("5 teams"), "5 个团队");
assert.equal(translate("$12.50 available"), "可用额度 $12.50");
assert.equal(translate("emojis"), "表情符号");
assert.equal(
  translate("Streamline security fixes by sharing relevant context with the right people"),
  "通过向合适的人员共享相关上下文，简化安全问题修复"
);
assert.equal(
  translate("Never lose an issue, project, or cycle"),
  "永不丢失任何议题、项目或周期"
);
assert.equal(translate("Issue estimation"), "议题估算");
assert.equal(translate("Backlog issues"), "积压事项中的议题");
assert.equal(translate("Started issues"), "已开始的议题");
assert.equal(translate("Auto-close stale issues"), "自动关闭长期未更新的议题");
assert.equal(translate("Ask Linear..."), "询问 Linear……");
assert.equal(translate("Create a new project"), "创建新项目");
assert.equal(translate("Keyboard shortcuts"), "键盘快捷键");
assert.equal(translate("Download apps"), "下载应用");
assert.equal(translate("What’s new"), "最新动态");
assert.equal(translate("Log in to Linear"), "登录 Linear");
assert.equal(
  translate("Create issues and answer questions about your workspace"),
  "创建议题并回答有关工作区的问题"
);
assert.equal(translate("Enable Linear Agent"), "启用 Linear 智能体");
assert.equal(
  translate("Allow conversations with Linear Agent inside your workspace"),
  "允许在工作区内与 Linear 智能体对话"
);
assert.equal(
  translate("Allow Linear Agent to use MCP connectors added by workspace members"),
  "允许 Linear 智能体使用工作区成员添加的 MCP 连接器"
);
assert.equal(translate(". Add personal MCP connectors in"), "。如需添加个人 MCP 连接器，请前往");
assert.equal(translate("Enable MCP connectors"), "启用 MCP 连接器");
assert.equal(translate("Allowed MCP connectors"), "允许使用的 MCP 连接器");
assert.equal(translate("Workspace guidance"), "工作区指导");
assert.equal(translate("Optional agent guidance..."), "可选的智能体指导…");
assert.equal(translate("Team access"), "团队访问权限");
assert.equal(
  translate("Control who can access the team and its content. Private teams are visible only to team members and workspace admins."),
  "控制谁可以访问此团队及其内容。私有团队仅对团队成员和工作区管理员可见。"
);
assert.equal(translate("Used for team schedules, dates, and cycle start times"), "用于团队日程、日期和周期开始时间");
assert.equal(
  translate("Copy workflows, cycle, and team settings from another team. Team members and Slack notification settings won't be copied."),
  "从其他团队复制工作流、周期和团队设置。不会复制团队成员和 Slack 通知设置。"
);
assert.equal(translate("Copy from team"), "从团队复制");
assert.equal(translate("Don’t copy"), "不复制");
assert.equal(translate("Continue with email"), "使用电子邮件继续");
assert.equal(translate("What’s your email address?"), "您的电子邮件地址是什么？");
assert.equal(translate("Enter your email address…"), "输入您的电子邮件地址……");
assert.equal(
  translate("Coding sessions: environments, browser use, and updated pricing"),
  "编码会话：环境、浏览器使用与定价更新"
);
assert.equal(
  translate("Research a topic across the issue backlog"),
  "围绕积压事项中的议题开展研究"
);
assert.equal(
  translate("Admins and guests can always authenticate via Google and email/passkeys\u200a—\u200aeven when disabled for members"),
  "管理员和访客始终可以通过 Google 和电子邮件/通行密钥验证，即使成员已停用这些方式。"
);

console.log("translation tests passed");

const fallbackSource = fs.readFileSync(path.join(root, "js", "agent-fallback.js"), "utf8");
vm.runInContext(fallbackSource, context, { filename: "agent-fallback.js" });
const fallback = context.globalThis.LinearCNAgentFallbackMap;
assert.equal(fallback.get("Ask Linear…"), "询问 Linear……");
assert.equal(fallback.get("Create a new project"), "创建新项目");
assert.equal(fallback.get("Keyboard shortcuts"), "键盘快捷键");
assert.equal(fallback.get("Open help menu"), "打开帮助菜单");
assert.equal(fallback.get("Log in to Linear"), "登录 Linear");
assert.equal(fallback.get("Back to login"), "返回登录");
console.log("agent fallback tests passed");
