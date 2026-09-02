/** Rebuild only the current versioned package output before contract tests. */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const distBase = path.join(root, "dist");
const distRoot = path.join(distBase, manifest.version);

if (path.dirname(distRoot) !== distBase) {
  throw new Error(`Unsafe manifest version for package test: ${manifest.version}`);
}

fs.rmSync(distRoot, { recursive: true, force: true });
require("./build-multiplatform.cjs");
