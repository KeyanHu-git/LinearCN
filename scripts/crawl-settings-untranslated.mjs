/**
 * Read-only collector for rendered English candidates in Linear settings.
 *
 * It navigates an explicitly debuggable local session, excludes protected user
 * content, and writes evidence for review. It does not change Linear data.
 */
import fs from "node:fs";
import path from "node:path";

const port = 9223;
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

function call(method, params = {}) {
  const id = ++requestId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const response = await call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text || "Runtime.evaluate failed");
  }
  return response.result.value;
}

async function waitForLocation(url, timeoutMs = 5000) {
  const expected = new URL(url).pathname;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await evaluate(`({ pathname: location.pathname, ready: document.readyState })`);
    if (state.pathname === expected && state.ready === "complete") return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expected}`);
}

async function waitForAppSettled(timeoutMs = 8000) {
  const started = Date.now();
  let lastSignature = "";
  let stablePasses = 0;
  while (Date.now() - started < timeoutMs) {
    const state = await evaluate(`(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title,
        length: text.length,
        tail: text.slice(-160)
      };
    })()`);
    const signature = JSON.stringify(state);
    if (state.title !== "Linear" && state.length > 250 && signature === lastSignature) {
      stablePasses += 1;
      if (stablePasses >= 2) return;
    } else {
      stablePasses = 0;
    }
    lastSignature = signature;
    await new Promise(resolve => setTimeout(resolve, 180));
  }
  throw new Error("Timed out waiting for Linear SPA content to settle");
}

const settingsUrls = await evaluate(`(() => {
  const urls = [...document.querySelectorAll('a[href]')]
    .map(anchor => anchor.href)
    .filter(href => {
      try {
        const url = new URL(href);
        return url.origin === location.origin && url.pathname.includes('/settings/');
      } catch {
        return false;
      }
    });
  urls.push(location.href);
  return [...new Set(urls.map(href => {
    const url = new URL(href);
    return url.origin + url.pathname;
  }))].sort();
})()`);

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
    if (!text || text.length > 320 || !english.test(text)) return false;
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
      className: typeof element.className === 'string' ? element.className : '',
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
      attributes.push({ name, value, tag: element.tagName, role: element.getAttribute('role') });
    }
  }

  return { title: document.title, url: location.href, texts, attributes };
})()`;

await call("Page.enable");
const pages = [];
const failures = [];
for (const url of settingsUrls) {
  try {
    await call("Page.navigate", { url });
    await waitForLocation(url);
    await waitForAppSettled();
    pages.push(await evaluate(collectExpression));
  } catch (error) {
    failures.push({ url, error: String(error) });
  }
}

socket.close();

const aggregate = new Map();
for (const item of pages) {
  for (const row of item.texts) {
    const existing = aggregate.get(row.text) || { text: row.text, hasHan: row.hasHan, pages: [] };
    existing.pages.push({ title: item.title, url: item.url });
    aggregate.set(row.text, existing);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  pageCount: pages.length,
  failureCount: failures.length,
  failures,
  uniqueTextCount: aggregate.size,
  uniqueTexts: [...aggregate.values()].sort((a, b) => a.text.localeCompare(b.text)),
  pages
};

const reportLabel = (process.argv[2] || "latest").replace(/[^a-z0-9_-]/gi, "-");
const outputPath = path.resolve(`work/linearcn-enhanced/audits/settings-untranslated-${reportLabel}.json`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
process.stdout.write(JSON.stringify({
  outputPath,
  pageCount: report.pageCount,
  failureCount: report.failureCount,
  uniqueTextCount: report.uniqueTextCount,
  urls: pages.map(item => item.url)
}, null, 2));
