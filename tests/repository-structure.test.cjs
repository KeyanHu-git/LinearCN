/** Repository governance contracts: documentation depth, labels, and templates. */
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const firstLevelDirectories = [".github", "img", "js", "platforms", "scripts", "tests"];

for (const directory of firstLevelDirectories) {
  assert.ok(fs.existsSync(path.join(root, directory, "README.md")), `${directory}/README.md is required`);
}

const allowedDeepReadmes = new Set(["platforms/windows/README.md"]);
function collectReadmes(directory, relative = "") {
  const rows = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "dist", "audits", "node_modules"].includes(entry.name)) continue;
    const childRelative = path.posix.join(relative, entry.name);
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) rows.push(...collectReadmes(child, childRelative));
    else if (entry.name === "README.md") rows.push(childRelative);
  }
  return rows;
}

for (const readme of collectReadmes(root)) {
  const depth = readme.split("/").length - 1;
  assert.ok(depth <= 1 || allowedDeepReadmes.has(readme), `unexpected structural README: ${readme}`);
}

const architecture = fs.readFileSync(path.join(root, "ARCHITECTURE.md"), "utf8");
for (const directory of firstLevelDirectories) {
  assert.ok(architecture.includes(`\`${directory}/\``), `ARCHITECTURE.md must describe ${directory}/`);
}

const labels = JSON.parse(fs.readFileSync(path.join(root, ".github", "labels.json"), "utf8"));
const labelNames = new Set(labels.map(label => label.name));
assert.equal(labelNames.size, labels.length, "label names must be unique");

for (const template of fs.readdirSync(path.join(root, ".github", "ISSUE_TEMPLATE"))) {
  if (!template.endsWith(".yml") || template === "config.yml") continue;
  const source = fs.readFileSync(path.join(root, ".github", "ISSUE_TEMPLATE", template), "utf8");
  const match = source.match(/^labels:\s*(\[[^\n]+\])/m);
  assert.ok(match, `${template} must declare labels`);
  for (const label of JSON.parse(match[1])) {
    assert.ok(labelNames.has(label), `${template} references undefined label: ${label}`);
  }
}

for (const file of [
  "js/content.js",
  "js/content.legacy.js",
  "platforms/windows/install.mjs",
  "scripts/audit-translations.cjs",
  "scripts/build-multiplatform.cjs",
  "scripts/generate-quality-overrides.cjs"
]) {
  assert.ok(fs.readFileSync(path.join(root, file), "utf8").startsWith("/**"), `${file} needs a boundary comment`);
}

execFileSync(process.execPath, [path.join(root, "scripts", "sync-github-labels.mjs"), "--check"], { stdio: "inherit" });
console.log("repository structure tests passed");
