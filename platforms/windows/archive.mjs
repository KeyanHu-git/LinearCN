/**
 * Shared archive transaction for installation, repair and rollback.
 * Original archives live in user data; the journal recovers an interrupted commit.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { createPackage, extractAll, uncache } from "@electron/asar";
import { isPatched, patchMain, compareVersions, LINEARCN_VERSION, MINIMUM_LINEAR_VERSION } from "./patch-core.mjs";

export const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export function writeJson(file, value) {
  const next = file + ".next";
  fs.writeFileSync(next, JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(next, file);
}
export function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}
export async function acquireLock(root) {
  const id = crypto.createHash("sha256").update(path.resolve(root).toLowerCase()).digest("hex").slice(0, 24);
  const address = process.platform === "win32" ? "\\\\.\\pipe\\linearcn-" + id : path.join(os.tmpdir(), "linearcn-" + id + ".sock");
  const server = net.createServer(socket => socket.end());
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(address, resolve); });
  return () => server.close();
}
function cleanup(directory) {
  const real = fs.realpathSync(directory);
  if (!real.startsWith(fs.realpathSync(os.tmpdir()) + path.sep)) throw new Error("临时路径越界");
  fs.rmSync(real, { recursive: true, force: true });
}
function assertTarget(file) {
  if (path.basename(file) !== "app.asar") throw new Error("目标必须为 app.asar");
}
export function recover(root, appAsar) {
  const journalFile = path.join(root, "pending.json");
  const journal = readJson(journalFile);
  if (!journal) return;
  if (path.resolve(journal.appAsar) !== path.resolve(appAsar)) throw new Error("未完成事务的目标不匹配");
  const actual = hash(appAsar);
  if (actual === journal.afterHash) writeJson(path.join(root, "install-state.json"), journal);
  else if (actual !== (journal.previousHash || journal.beforeHash)) throw new Error("更新器修改了未完成事务的目标；需要检查安装状态");
  fs.unlinkSync(journalFile);
}
export async function applyArchive(root, appAsar, { dryRun = false, canWrite = () => true, fault = () => {} } = {}) {
  appAsar = path.resolve(appAsar);
  assertTarget(appAsar);
  if (!dryRun) recover(root, appAsar);
  const beforeHash = hash(appAsar);
  const previous = readJson(path.join(root, "install-state.json"));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "linearcn-transaction-"));
  const next = path.join(path.dirname(appAsar), "app.asar.linearcn-next");
  try {
    const snapshot = path.join(temp, "source.asar");
    fs.copyFileSync(appAsar, snapshot);
    if (hash(snapshot) !== beforeHash) throw new Error("Linear 正在更新，稍后重试");
    const unpack = path.join(temp, "unpack");
    extractAll(snapshot, unpack);
    const pkg = JSON.parse(fs.readFileSync(path.join(unpack, "package.json"), "utf8"));
    if (pkg.name !== "@linear/desktop" || compareVersions(pkg.version, MINIMUM_LINEAR_VERSION) < 0) throw new Error("不支持的 Linear 程序包");
    const main = path.join(unpack, "out", "main", "index.js");
    let source = fs.readFileSync(main, "utf8");
    if (isPatched(source)) return { changed: false, linearVersion: pkg.version };
    let originalHash = beforeHash;
    let original = snapshot;
    if (/LinearCN.*loaded|LinearCN Enhanced/.test(source)) {
      if (!previous || previous.afterHash !== beforeHash || !fs.existsSync(previous.backup) || hash(previous.backup) !== previous.beforeHash) {
        throw new Error("旧补丁的原始备份无法验证，未修改程序");
      }
      original = previous.backup;
      originalHash = previous.beforeHash;
      const clean = path.join(temp, "clean");
      uncache(original);
      extractAll(original, clean);
      const cleanPkg = JSON.parse(fs.readFileSync(path.join(clean, "package.json"), "utf8"));
      if (cleanPkg.version !== pkg.version) throw new Error("备份版本不匹配");
      source = fs.readFileSync(path.join(clean, "out", "main", "index.js"), "utf8");
    }
    const patched = patchMain(source).source;
    if (dryRun) return { changed: true, linearVersion: pkg.version, dryRun: true };
    const backup = path.join(root, "backups", "Linear-" + pkg.version + "-" + originalHash + ".asar");
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    if (!fs.existsSync(backup)) fs.copyFileSync(original, backup, fs.constants.COPYFILE_EXCL);
    if (hash(backup) !== originalHash) throw new Error("备份校验失败");
    fs.writeFileSync(main, patched);
    const packed = path.join(temp, "patched.asar");
    await createPackage(unpack, packed);
    const afterHash = hash(packed);
    fault("prepared");
    if (!canWrite() || hash(appAsar) !== beforeHash) throw new Error("Linear 已启动或正在更新，稍后重试");
    const state = { version: LINEARCN_VERSION, linearVersion: pkg.version, appAsar, backup,
      beforeHash: originalHash, afterHash, repairedAt: new Date().toISOString() };
    // The journal uses the actual current hash, which can be an older patch.
    writeJson(path.join(root, "pending.json"), { ...state, previousHash: beforeHash });
    fs.copyFileSync(packed, next);
    if (!canWrite() || hash(appAsar) !== beforeHash) throw new Error("提交前状态发生变化");
    fs.renameSync(next, appAsar);
    fault("switched");
    writeJson(path.join(root, "install-state.json"), state);
    fs.unlinkSync(path.join(root, "pending.json"));
    return { changed: true, ...state };
  } finally {
    uncache(path.join(temp, "source.asar"));
    if (!dryRun && fs.existsSync(next)) fs.unlinkSync(next);
    cleanup(temp);
  }
}
