// Agent views can be hosted in a separate Electron WebContents where Chrome content scripts
// are not attached. The desktop loader injects this narrow, local fallback into every
// WebContents. It only replaces reviewed Agent UI strings and never reads user content.

(() => {
  "use strict";

  if (globalThis.__LinearCNAgentFallbackLoaded) return;
  globalThis.__LinearCNAgentFallbackLoaded = true;

  const translations = new Map([
    ["Log in to Linear", "登录 Linear"],
    ["Continue with Google", "使用 Google 继续"],
    ["Continue with email", "使用电子邮件继续"],
    ["Continue with SAML SSO", "使用 SAML SSO 继续"],
    ["Continue with SAML", "使用 SAML 继续"],
    ["Log in with passkey", "使用通行密钥登录"],
    ["Don’t have an account?", "还没有账号？"],
    ["Don't have an account?", "还没有账号？"],
    ["Sign up", "注册"],
    ["or", "或"],
    ["learn more", "了解更多"],
    ["What’s your email address?", "您的电子邮件地址是什么？"],
    ["What's your email address?", "您的电子邮件地址是什么？"],
    ["Enter your email address…", "输入您的电子邮件地址……"],
    ["Enter your email address...", "输入您的电子邮件地址……"],
    ["Back to login", "返回登录"],
    ["Open help menu", "打开帮助菜单"],
    ["Help with…", "搜索帮助……"],
    ["Showing all items", "显示所有项目"],
    ["Question Mark", "问号"],
    ["Keyboard shortcuts", "键盘快捷键"],
    ["Linear status", "Linear 状态"],
    ["Download apps", "下载应用"],
    ["Slack community", "Slack 社区"],
    ["What's new", "最新动态"],
    ["What’s new", "最新动态"],
    ["Coding sessions: environments, browser use, and updated pricing", "编码会话：环境、浏览器使用与定价更新"],
    ["New chat", "新对话"],
    ["Switch agent chat", "切换智能体对话"],
    ["Ask Linear...", "询问 Linear……"],
    ["Ask Linear…", "询问 Linear……"],
    ["Get started with some examples", "从以下示例开始"],
    ["Create a new project", "创建新项目"],
    ["Turn an idea into a well-scoped project", "将想法转化为范围明确的项目"],
    ["Research a topic", "研究一个主题"],
    ["Research a topic across the issue backlog", "围绕积压事项中的议题开展研究"],
    ["Set up new team", "设置新团队"],
    ["Create a team that matches how your organization works", "创建符合您组织工作方式的团队"],
    ["Create a new project Turn an idea into a well-scoped project", "创建新项目 将想法转化为范围明确的项目"],
    ["Research a topic Research a topic across the issue backlog", "研究一个主题 围绕积压事项中的议题开展研究"],
    ["Set up new team Create a team that matches how your organization works", "设置新团队 创建符合您组织工作方式的团队"],
    ["Attach images, files, or videos", "附加图片、文件或视频"],
    ["Submit comment", "发送消息"]
  ]);
  globalThis.LinearCNAgentFallbackMap = translations;

  if (typeof document === "undefined") return;

  const attributes = [
    "aria-label",
    "aria-placeholder",
    "data-empty-text",
    "data-label",
    "placeholder",
    "title"
  ];
  const sourceStrings = [...translations.keys()];

  function translateValue(value) {
    if (!value) return value;
    const leading = value.match(/^\s*/u)?.[0] || "";
    const trailing = value.match(/\s*$/u)?.[0] || "";
    const core = value.slice(leading.length, value.length - trailing.length);
    return translations.has(core) ? `${leading}${translations.get(core)}${trailing}` : value;
  }

  function translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const translated = translateValue(node.nodeValue);
      if (translated !== node.nodeValue) node.nodeValue = translated;
      return;
    }
    if (!(node instanceof Element)) return;
    for (const name of attributes) {
      if (!node.hasAttribute(name)) continue;
      const current = node.getAttribute(name);
      const translated = translateValue(current);
      if (translated !== current) node.setAttribute(name, translated);
    }
  }

  function containsCandidate(node) {
    if (node.nodeType === Node.TEXT_NODE) return translations.has(node.nodeValue.trim());
    if (!(node instanceof Element)) return false;
    for (const name of attributes) {
      if (translations.has(node.getAttribute(name)?.trim())) return true;
    }
    const text = node.textContent || "";
    return sourceStrings.some(source => text.includes(source));
  }

  function translateSubtree(root) {
    if (!root || !containsCandidate(root)) return;
    translateNode(root);
    if (!(root instanceof Element)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateNode(node);
  }

  const pending = new Set();
  let scheduled = false;

  function flush() {
    scheduled = false;
    const nodes = [...pending];
    pending.clear();
    for (const node of nodes) translateSubtree(node);
  }

  function schedule(node) {
    if (node) pending.add(node);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flush);
  }

  function start() {
    if (!document.getElementById("linearcn-agent-placeholder-style")) {
      const style = document.createElement("style");
      style.id = "linearcn-agent-placeholder-style";
      style.textContent = [
        '.ProseMirror[aria-label="向 Linear AI 发送消息"] .editor-placeholder::before,',
        '.ProseMirror[aria-label="Send a message to Linear AI"] .editor-placeholder::before {',
        '  content: "询问 Linear……" !important;',
        '}'
      ].join("\n");
      document.head.appendChild(style);
    }
    schedule(document.documentElement);
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) schedule(node);
        } else if (mutation.type === "characterData") {
          schedule(mutation.target);
        } else if (mutation.type === "attributes") {
          schedule(mutation.target);
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributes
    });
    window.addEventListener("unload", () => observer.disconnect(), { once: true });
  }

  const boot = () => setTimeout(start, 900);
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot, { once: true });
})();
