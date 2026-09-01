/**
 * Recursive, read-only collector for rendered English candidates in Linear settings.
 *
 * Starting from the current debuggable page, the crawler discovers settings links
 * again after every navigation. A depth of 2 therefore covers sidebar entries and
 * their nested pages instead of stopping at the first visible hierarchy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 9223;
const reportLabel = (process.argv[2] || "latest").replace(/[^a-z0-9_-]/gi, "-");
const maxDepth = Number.parseInt(process.argv[3] || "2", 10);
const maxPages = Number.parseInt(process.argv[4] || "180", 10);
const outputPath = path.join(root, "audits", `settings-untranslated-${reportLabel}.json`);
const checkpointPath = path.join(root, "audits", `settings-untranslated-${reportLabel}-checkpoint.json`);
if (!Number.isInteger(maxDepth) || maxDepth < 0) throw new Error("maxDepth must be a non-negative integer");
if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error("maxPages must be a positive integer");

const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json());
const page = targets.find(target => target.type === "page" && target.url.startsWith("https://linear.app/"));
if (!page) throw new Error("No debuggable Linear page found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let requestId = 0;
const pending = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function call(method, params = {}, timeoutMs = 10000) {
  const id = ++requestId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, {
      resolve: value => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: error => {
        clearTimeout(timer);
        reject(error);
      }
    });
  });
}

async function evaluate(expression) {
  const response = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "Runtime.evaluate failed");
  return response.result.value;
}

function normalizeSettingsUrl(value) {
  const url = new URL(value);
  if (url.origin !== "https://linear.app" || !url.pathname.includes("/settings/")) return null;
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

async function waitForLocation(url, timeoutMs = 7000) {
  const expected = new URL(url).pathname.replace(/\/$/, "");
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const pathname = await evaluate("location.pathname.replace(/\\/$/, '')");
    if (pathname === expected) return;
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for ${expected}`);
}

async function waitForAppSettled(timeoutMs = 4000) {
  const started = Date.now();
  let previous = "";
  let stablePasses = 0;
  let lastState = null;
  while (Date.now() - started < timeoutMs) {
    const state = await evaluate(`(() => {
      const text = document.body?.innerText || '';
      return { ready: document.readyState, length: text.length, tail: text.slice(-220) };
    })()`);
    lastState = state;
    const signature = JSON.stringify(state);
    if (state.ready === "complete" && state.length > 200 && signature === previous) stablePasses += 1;
    else stablePasses = 0;
    if (stablePasses >= 2) return true;
    previous = signature;
    await new Promise(resolve => setTimeout(resolve, 220));
  }
  if (lastState?.ready === "complete" && lastState.length > 200) return false;
  throw new Error("Timed out waiting for Linear SPA content to settle");
}

const discoverExpression = `(() => [...new Set([...document.querySelectorAll('a[href]')]
  .map(anchor => {
    try {
      const url = new URL(anchor.href);
      if (url.origin !== location.origin || !url.pathname.includes('/settings/')) return null;
      return url.origin + url.pathname.replace(/\\/$/, '');
    } catch {
      return null;
    }
  })
  .filter(Boolean))].sort())()`;

const collectExpression = `(() => {
  const english = /[A-Za-z]{2,}/;
  const han = /[\\u3400-\\u9fff]/;
  const protectedSelector = [
    'script', 'style', 'noscript', 'textarea', 'input', 'pre', 'code',
    '[contenteditable="true"]', '[role="textbox"]', '[data-slate-editor="true"]',
    '[class*="syntax-"]', '[class*="monaco-editor"]', '[class*="cm-editor"]',
    'a[href*="/issue/"]', 'a[href*="/project/"]'
  ].join(',');
  const isRendered = element => {
    if (!element || !element.isConnected) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };
  const isCandidate = text => {
    if (!text || text.length > 360 || !english.test(text)) return false;
    if (/https?:\\/\\//i.test(text) || /\\S+@\\S+/.test(text)) return false;
    if (/^[A-Z]{2,5}-\\d+$/.test(text)) return false;
    return true;
  };

  const texts = [];
  const textSeen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const element = node.parentElement;
    const text = node.nodeValue.replace(/\\s+/g, ' ').trim();
    if (!element || !isCandidate(text) || !isRendered(element)) continue;
    if (element.closest(protectedSelector) || textSeen.has(text)) continue;
    textSeen.add(text);
    texts.push({
      text,
      hasHan: han.test(text),
      tag: element.tagName,
      role: element.getAttribute('role'),
      testId: element.getAttribute('data-testid')
    });
  }

  const attributes = [];
  const attributeSeen = new Set();
  for (const element of document.querySelectorAll('[aria-label],[data-label],[placeholder],[title],[alt]')) {
    if (!isRendered(element)) continue;
    for (const name of ['aria-label', 'data-label', 'placeholder', 'title', 'alt']) {
      const value = element.getAttribute(name)?.replace(/\\s+/g, ' ').trim();
      if (!isCandidate(value)) continue;
      const key = name + '\\u0000' + value;
      if (attributeSeen.has(key)) continue;
      attributeSeen.add(key);
      attributes.push({ name, value, hasHan: han.test(value), tag: element.tagName, role: element.getAttribute('role') });
    }
  }

  return { title: document.title, url: location.href, texts, attributes };
})()`;

await call("Page.enable");
const startUrl = normalizeSettingsUrl(page.url);
if (!startUrl) throw new Error(`Current Linear page is not a settings route: ${page.url}`);

const queue = [{ url: startUrl, depth: 0, parent: null }];
const discovered = new Map([[startUrl, queue[0]]]);
const pages = [];
const failures = [];

while (queue.length > 0 && pages.length + failures.length < maxPages) {
  const current = queue.shift();
  try {
    await call("Page.navigate", { url: current.url });
    await waitForLocation(current.url);
    const settled = await waitForAppSettled();
    const collected = await evaluate(collectExpression);
    pages.push({ ...collected, depth: current.depth, parent: current.parent, settled });

    if (current.depth < maxDepth) {
      for (const candidate of await evaluate(discoverExpression)) {
        const url = normalizeSettingsUrl(candidate);
        if (!url || discovered.has(url)) continue;
        const next = { url, depth: current.depth + 1, parent: current.url };
        discovered.set(url, next);
        queue.push(next);
      }
    }
  } catch (error) {
    failures.push({ ...current, error: String(error) });
  }
  if ((pages.length + failures.length) % 10 === 0) {
    fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
    fs.writeFileSync(checkpointPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      startUrl,
      maxDepth,
      maxPages,
      discoveredCount: discovered.size,
      pages,
      failures,
      queue
    }, null, 2), "utf8");
    process.stderr.write(`[crawl] visited=${pages.length + failures.length} discovered=${discovered.size} queued=${queue.length}\n`);
  }
}

socket.close();

const aggregate = new Map();
for (const item of pages) {
  for (const row of item.texts) {
    const existing = aggregate.get(row.text) || { text: row.text, hasHan: row.hasHan, pages: [] };
    existing.pages.push({ title: item.title, url: item.url, depth: item.depth });
    aggregate.set(row.text, existing);
  }
}

const uniqueTexts = [...aggregate.values()].sort((a, b) => a.text.localeCompare(b.text));
const report = {
  generatedAt: new Date().toISOString(),
  startUrl,
  maxDepth,
  maxPages,
  discoveredCount: discovered.size,
  pageCount: pages.length,
  failureCount: failures.length,
  unsettledPageCount: pages.filter(item => !item.settled).length,
  queueRemaining: queue.length,
  failures,
  uniqueTextCount: uniqueTexts.length,
  untranslatedTextCount: uniqueTexts.filter(item => !item.hasHan).length,
  mixedTextCount: uniqueTexts.filter(item => item.hasHan).length,
  uniqueTexts,
  pages
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
process.stdout.write(JSON.stringify({
  outputPath,
  startUrl,
  maxDepth,
  discoveredCount: report.discoveredCount,
  pageCount: report.pageCount,
  failureCount: report.failureCount,
  unsettledPageCount: report.unsettledPageCount,
  queueRemaining: report.queueRemaining,
  uniqueTextCount: report.uniqueTextCount,
  untranslatedTextCount: report.untranslatedTextCount
}, null, 2));
