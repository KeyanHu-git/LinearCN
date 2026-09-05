/** Archive transactions recover interrupted switches and refuse mismatched backups. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPackage, extractFile, uncache } from "../platforms/windows/node_modules/@electron/asar/lib/asar.js";
import { applyArchive, acquireLock, hash, readJson } from "../platforms/windows/archive.mjs";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "linearcn-test-"));
const root = path.join(temp, "state");
const app = path.join(temp, "resources", "app.asar");
fs.mkdirSync(root);
fs.mkdirSync(path.dirname(app));
const fixture = path.join(temp, "fixture");
fs.mkdirSync(path.join(fixture, "out", "main"), { recursive: true });
fs.writeFileSync(path.join(fixture, "package.json"), JSON.stringify({ name: "@linear/desktop", version: "1.32.4" }));
fs.writeFileSync(path.join(fixture, "out", "main", "index.js"), "r.app.on(`ready`,async()=>{if(!await gate()){}})");
try {
  await createPackage(fixture, app);
  const original = hash(app);
  const lock = await acquireLock(root);
  await assert.rejects(acquireLock(root), { code: "EADDRINUSE" });
  lock();
  await new Promise(r => setTimeout(r, 50));
  const lockAgain = await acquireLock(root);
  lockAgain();
  await applyArchive(root, app, { dryRun: true });
  assert.equal(hash(app), original);
  assert.equal(fs.existsSync(path.join(root, "install-state.json")), false);
  await assert.rejects(applyArchive(root, app, { canWrite: () => false }), /稍后重试/);
  assert.equal(hash(app), original);
  await assert.rejects(applyArchive(root, app, { fault: stage => { if (stage === "prepared") throw new Error("before switch"); } }), /before switch/);
  assert.equal(hash(app), original);
  await assert.rejects(applyArchive(root, app, { fault: stage => { if (stage === "switched") throw new Error("power loss"); } }), /power loss/);
  assert.ok(fs.existsSync(path.join(root, "pending.json")));
  const recovered = await applyArchive(root, app);
  assert.equal(recovered.changed, false);
  assert.equal(fs.existsSync(path.join(root, "pending.json")), false);
  const state = readJson(path.join(root, "install-state.json"));
  assert.equal(hash(state.backup), original);
  assert.equal(hash(app), state.afterHash);
  uncache(app);
  assert.match(extractFile(app, path.join("out", "main", "index.js")).toString(), /LinearCN 1\.0\.1 loaded/);
  // Simulate replacement of the entire resources directory, not just file contents.
  fs.renameSync(path.dirname(app), path.join(temp, "old-resources"));
  fs.mkdirSync(path.dirname(app));
  fs.copyFileSync(state.backup, app);
  assert.equal((await applyArchive(root, app)).changed, true);
  assert.equal(readJson(path.join(root, "install-state.json")).beforeHash, original);
  console.log("archive transaction and directory replacement tests passed");
} finally {
  const absolute = fs.realpathSync(temp);
  assert.ok(absolute.startsWith(fs.realpathSync(os.tmpdir()) + path.sep));
  fs.rmSync(absolute, { recursive: true, force: true });
}

