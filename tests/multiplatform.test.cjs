const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceManifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const dist = path.join(root, "dist", sourceManifest.version);
const chromium = JSON.parse(fs.readFileSync(path.join(dist, "chromium", "manifest.json"), "utf8"));
const firefox = JSON.parse(fs.readFileSync(path.join(dist, "firefox", "manifest.json"), "utf8"));
const userscript = fs.readFileSync(path.join(dist, "userscript", "LinearCN-Enhanced.user.js"), "utf8");

assert.equal(chromium.manifest_version, 3);
assert.equal(chromium.version, sourceManifest.version);
assert.deepEqual(chromium.permissions || [], []);
assert.ok(chromium.content_scripts[0].matches.includes("*://linear.app/*"));
assert.equal(firefox.browser_specific_settings.gecko.data_collection_permissions.required[0], "none");
assert.ok(firefox.browser_specific_settings.gecko_android);
assert.match(userscript, /@match\s+https:\/\/linear\.app\/\*/);
assert.match(userscript, /LinearCNQualityEntries/);
assert.doesNotMatch(userscript, /fetch\s*\(/);
assert.doesNotMatch(userscript, /XMLHttpRequest|WebSocket|eval\s*\(/);
assert.ok(fs.existsSync(path.join(dist, "windows-desktop", "extension", "js", "agent-fallback.js")));
assert.ok(fs.existsSync(path.join(dist, "macos", "safari-webextension", "manifest.json")));
assert.ok(fs.existsSync(path.join(dist, "macos", "LinearCN-Enhanced.user.js")));

console.log("multiplatform package tests passed");
