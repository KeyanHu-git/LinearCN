/**
 * Offline classifier for settings-crawl evidence.
 *
 * Each captured string is passed through the current translation engine. Only
 * unchanged strings remain missing candidates, so a minimized or untranslated
 * audit window cannot inflate the missing count with already-covered labels.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const inputPath = path.resolve(process.argv[2] || "");
if (!process.argv[2] || !fs.existsSync(inputPath)) {
  throw new Error("Usage: node scripts/analyze-crawl-report.cjs <crawl-report.json>");
}

const context = vm.createContext({ globalThis: {}, console });
for (const file of [
  "translations-base.js",
  "translations-enhanced.js",
  "translations-settings.js",
  "translations-settings-nested.js",
  "translations-integrations.js",
  "translations-quality.js",
  "content.js"
]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), context, { filename: file });
}

const translate = context.globalThis.LinearCNEngine.translateString;
const report = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const occurrences = new Map();

function add(kind, value, page) {
  if (!value || !/[A-Za-z]{2,}/.test(value)) return;
  const key = `${kind}\u0000${value}`;
  const row = occurrences.get(key) || { kind, text: value, pages: [] };
  row.pages.push({ title: page.title, url: page.url, depth: page.depth });
  occurrences.set(key, row);
}

for (const page of report.pages) {
  for (const row of page.texts || []) add("text", row.text, page);
  for (const row of page.attributes || []) add(`attribute:${row.name}`, row.value, page);
}

const integrationTitles = new Set(
  report.pages
    .filter(page => /\/settings\/integrations\//.test(new URL(page.url).pathname))
    .map(page => page.title)
);

function ignoreReason(row) {
  const value = row.text;
  if (integrationTitles.has(value)) return "integration-name";
  if (/https?:\/\/|\bwww\.|\.(?:com|ai|dev|io|app|json)\b/i.test(value)) return "url-or-path";
  if (/\{\{[^}]+\}\}|~\//.test(value)) return "template-or-path";
  if (/^\$?[\d.,]+(?:\s*(?:MB|GB|%|remaining|members?))?$/i.test(value)) return "numeric-value";
  if (/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i.test(value)) return "date-value";
  return null;
}

const rows = [...occurrences.values()].map(row => {
  const translated = translate(row.text);
  const ignored = ignoreReason(row);
  return {
    ...row,
    occurrenceCount: row.pages.length,
    translated,
    covered: translated !== row.text,
    ignored
  };
});

const missing = rows
  .filter(row => !row.covered && !row.ignored)
  .sort((a, b) => b.occurrenceCount - a.occurrenceCount || a.text.localeCompare(b.text));
const outputPath = inputPath.replace(/\.json$/i, "-analysis.json");
const analysis = {
  generatedAt: new Date().toISOString(),
  source: inputPath,
  totals: {
    captured: rows.length,
    covered: rows.filter(row => row.covered).length,
    ignored: rows.filter(row => !row.covered && row.ignored).length,
    missing: missing.length
  },
  missing,
  ignored: rows.filter(row => !row.covered && row.ignored),
  covered: rows.filter(row => row.covered)
};

fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), "utf8");
console.log(JSON.stringify({ outputPath, ...analysis.totals }, null, 2));
