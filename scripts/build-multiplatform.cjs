/**
 * Deterministic packager for all supported delivery shells.
 *
 * Runtime files are copied from the shared core. Refusing an existing versioned
 * output prevents a stale package from being silently mixed into a release.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const version = manifest.version;
const distRoot = path.join(root, "dist", version);
if (fs.existsSync(distRoot)) throw new Error(`Distribution directory already exists: ${distRoot}`);

const runtimeJs = [
  "translations-base.js",
  "translations-enhanced.js",
  "translations-settings.js",
  "translations-settings-nested.js",
  "translations-integrations.js",
  "translations-quality.js",
  "content.js"
];

function ensure(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function copyRuntime(destination, targetManifest, includeAgentFallback = false) {
  ensure(destination);
  ensure(path.join(destination, "img"));
  ensure(path.join(destination, "js"));
  fs.writeFileSync(path.join(destination, "manifest.json"), JSON.stringify(targetManifest, null, 2) + "\n", "utf8");
  for (const file of [
    "LICENSE",
    "README.md",
    "ARCHITECTURE.md",
    "CONTRIBUTING.md",
    "MULTIPLATFORM.md",
    "NOTICE.md",
    "PRIVACY.md"
  ]) {
    fs.copyFileSync(path.join(root, file), path.join(destination, file));
  }
  for (const file of fs.readdirSync(path.join(root, "img"))) {
    fs.copyFileSync(path.join(root, "img", file), path.join(destination, "img", file));
  }
  for (const file of runtimeJs) fs.copyFileSync(path.join(root, "js", file), path.join(destination, "js", file));
  if (includeAgentFallback) {
    fs.copyFileSync(path.join(root, "js", "agent-fallback.js"), path.join(destination, "js", "agent-fallback.js"));
  }
}

const chromiumDir = path.join(distRoot, "chromium");
copyRuntime(chromiumDir, manifest);

const firefoxManifest = structuredClone(manifest);
firefoxManifest.browser_specific_settings = {
  gecko: {
    id: "@linearcn-community",
    strict_min_version: "128.0",
    data_collection_permissions: { required: ["none"] }
  },
  gecko_android: {}
};
const firefoxDir = path.join(distRoot, "firefox");
copyRuntime(firefoxDir, firefoxManifest);

const userscriptDir = path.join(distRoot, "userscript");
ensure(userscriptDir);
const userscriptHeader = [
  "// ==UserScript==",
  "// @name         LinearCN",
  "// @namespace    linearcn-community",
  `// @version      ${version}`,
  "// @description  面向新版 Linear 的增强简体中文本地化",
  "// @match        https://linear.app/*",
  "// @match        https://*.linear.app/*",
  "// @run-at       document-start",
  "// @grant        none",
  "// @license      GPL-3.0-only",
  "// ==/UserScript==",
  ""
].join("\n");
const userscriptBody = runtimeJs.map(file => fs.readFileSync(path.join(root, "js", file), "utf8")).join("\n\n");
fs.writeFileSync(path.join(userscriptDir, "LinearCN.user.js"), userscriptHeader + userscriptBody, "utf8");

const windowsDir = path.join(distRoot, "windows-desktop");
ensure(windowsDir);
for (const file of ["package.json", "README.md", "install.mjs"]) {
  fs.copyFileSync(path.join(root, "platforms", "windows", file), path.join(windowsDir, file));
}
copyRuntime(path.join(windowsDir, "extension"), manifest, true);

const macosDir = path.join(distRoot, "macos");
ensure(macosDir);
ensure(path.join(macosDir, "chromium"));
ensure(path.join(macosDir, "firefox"));
ensure(path.join(macosDir, "safari-webextension"));
fs.cpSync(chromiumDir, path.join(macosDir, "chromium"), { recursive: true, force: true });
fs.cpSync(firefoxDir, path.join(macosDir, "firefox"), { recursive: true, force: true });
fs.cpSync(chromiumDir, path.join(macosDir, "safari-webextension"), { recursive: true, force: true });
const safariManifestPath = path.join(macosDir, "safari-webextension", "manifest.json");
const safariManifest = JSON.parse(fs.readFileSync(safariManifestPath, "utf8"));
safariManifest.browser_specific_settings = { safari: { strict_min_version: "14.0" } };
fs.writeFileSync(safariManifestPath, JSON.stringify(safariManifest, null, 2) + "\n", "utf8");
fs.copyFileSync(path.join(userscriptDir, "LinearCN.user.js"), path.join(macosDir, "LinearCN.user.js"));
fs.copyFileSync(path.join(root, "platforms", "macos", "README-macOS.md"), path.join(macosDir, "README-macOS.md"));

fs.copyFileSync(path.join(root, "MULTIPLATFORM.md"), path.join(distRoot, "COMPATIBILITY.md"));
process.stdout.write(JSON.stringify({ version, distRoot, targets: ["chromium", "firefox", "userscript", "windows-desktop", "macos"] }, null, 2));
