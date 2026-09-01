(() => {
  "use strict";

  const baseEntries = globalThis.LinearCNBaseEntries || [];
  const enhancedEntries = globalThis.LinearCNEnhancedEntries || [];
  const settingsEntries = globalThis.LinearCNSettingsEntries || [];
  const qualityEntries = globalThis.LinearCNQualityEntries || [];
  const dynamicPatterns = [
    ...(globalThis.LinearCNEnhancedPatterns || []),
    ...(globalThis.LinearCNSettingsPatterns || [])
  ];
  const translations = new Map([...baseEntries, ...enhancedEntries, ...settingsEntries, ...qualityEntries]);
  const normalizedTranslations = new Map();
  const translatedAttributes = ["aria-label", "aria-placeholder", "data-empty-text", "data-label", "placeholder", "title", "alt"];
  const protectedSelector = [
    "input",
    "textarea",
    "pre",
    "code",
    "[contenteditable='true']",
    "[role='textbox']",
    "[data-slate-editor='true']",
    "[class*='monaco-editor']",
    "[class*='cm-editor']",
    "[class*='CodeMirror']",
    "[class*='code-block']",
    "[class*='CodeBlock']",
    "[class*='syntax-highlight']",
    "[class*='syntax-']",
    "[data-language]",
    "[data-code-language]",
    "a[href*='/issue/']",
    "a[href*='/project/']"
  ].join(",");

  const stats = {
    textNodes: 0,
    attributes: 0,
    titles: 0,
    exactMatches: 0,
    normalizedMatches: 0,
    dynamicMatches: 0
  };

  function normalize(value) {
    return value
      .replace(/\u00a0/g, " ")
      .replace(/[\s\u2000-\u200b\u202f\u205f\u3000]+/gu, " ")
      .trim();
  }

  for (const [source, target] of translations) {
    const normalized = normalize(source);
    if (normalized && !normalizedTranslations.has(normalized)) {
      normalizedTranslations.set(normalized, target);
    }
  }

  function splitWhitespace(value) {
    const leading = value.match(/^\s*/u)?.[0] || "";
    const trailing = value.match(/\s*$/u)?.[0] || "";
    const core = value.slice(leading.length, value.length - trailing.length);
    return { leading, core, trailing };
  }

  function translateCore(core) {
    if (!core) return core;
    if (translations.has(core)) {
      stats.exactMatches += 1;
      return translations.get(core);
    }

    const normalized = normalize(core);
    if (normalizedTranslations.has(normalized)) {
      stats.normalizedMatches += 1;
      return normalizedTranslations.get(normalized);
    }

    const navigationMatch = /^Navigated to (.+)$/i.exec(normalized);
    if (navigationMatch) {
      const destination = navigationMatch[1];
      const translatedDestination = translations.get(destination)
        || normalizedTranslations.get(normalize(destination))
        || destination;
      stats.dynamicMatches += 1;
      return `已导航至 ${translatedDestination}`;
    }

    for (const [pattern, replacer] of dynamicPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(normalized);
      if (match) {
        stats.dynamicMatches += 1;
        return replacer(match);
      }
    }
    return core;
  }

  function translateString(value) {
    if (typeof value !== "string" || value.length === 0) return value;
    const { leading, core, trailing } = splitWhitespace(value);
    const translated = translateCore(core);
    return translated === core ? value : `${leading}${translated}${trailing}`;
  }

  function isProtected(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return Boolean(element?.closest?.(protectedSelector));
  }

  function translateTextNode(node) {
    if (!node?.nodeValue || isProtected(node)) return;
    const translated = translateString(node.nodeValue);
    if (translated !== node.nodeValue) {
      node.nodeValue = translated;
      stats.textNodes += 1;
    }
  }

  function translateElement(element) {
    if (!(element instanceof Element)) return;
    for (const attribute of translatedAttributes) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute);
      const translated = translateString(current);
      if (translated !== current) {
        element.setAttribute(attribute, translated);
        stats.attributes += 1;
      }
    }
  }

  function translateDocumentTitle() {
    const current = document.title;
    if (!current) return;
    const translated = current
      .split(" › ")
      .map(part => translateString(part))
      .join(" › ");
    if (translated !== current) {
      document.title = translated;
      stats.titles += 1;
    }
  }

  function translateSubtree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (!(root instanceof Element) && root !== document.documentElement) return;

    translateElement(root);
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      else translateElement(node);
    }
  }

  const pending = new Set();
  let scheduled = false;

  function flush() {
    scheduled = false;
    const nodes = [...pending];
    pending.clear();
    for (const node of nodes) translateSubtree(node);
    translateDocumentTitle();
  }

  function schedule(node) {
    if (node) pending.add(node);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flush);
  }

  function start() {
    document.documentElement.lang = "zh-CN";
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
      attributeFilter: translatedAttributes
    });

    window.addEventListener("unload", () => observer.disconnect(), { once: true });
  }

  globalThis.LinearCNEngine = {
    translateString,
    getStats: () => ({ ...stats }),
    version: "1.5.2"
  };

  if (typeof document !== "undefined") {
    if (document.documentElement) start();
    else window.addEventListener("DOMContentLoaded", start, { once: true });
  }
})();
