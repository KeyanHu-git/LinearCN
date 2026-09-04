/**
 * Persistent repair worker for Linear desktop updates.
 *
 * It watches the installed app.asar and reapplies the validated LinearCN patch
 * after an updater replaces the archive.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createPackage, extractAll } from "@electron/asar";
import { compareVersions, isPatched, LINEARCN_VERSION, MINIMUM_LINEAR_VERSION, patchMain } from "./patch-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const maintenanceRoot = path.dirname(scriptPath);
const installRoot = path.dirname(maintenanceRoot);
const statePath = path.join(installRoot, "install-state.json");
const lockPath = path.join(maintenanceRoot, "watch.pid");
const logPath = path.join(maintenanceRoot, "maintenance.log");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function log(message) {
  fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`, "utf8");
}

function readState() {
  if (!fs.existsSync(statePath)) throw new Error(`安装状态不存在：${statePath}`);
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function backupPath(linearVersion, hash) {
  return path.join(installRoot, "backups", `Linear-${linearVersion}-${hash.slice(0, 12)}.asar`);
}

async function repairOnce() {
  const state = readState();
  const appAsar = path.resolve(state.appAsar);
  if (!fs.existsSync(appAsar)) throw new Error(`app.asar 不存在：${appAsar}`);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "linearcn-repair-"));
  const patchedAsar = path.join(path.dirname(appAsar), `app.asar.linearcn-next-${process.pid}`);
  try {
    await extractAll(appAsar, tempRoot);
    const packageJson = JSON.parse(fs.readFileSync(path.join(tempRoot, "package.json"), "utf8"));
    if (compareVersions(packageJson.version, MINIMUM_LINEAR_VERSION) < 0) {
      throw new Error(`Linear ${packageJson.version} 低于最低支持版本 ${MINIMUM_LINEAR_VERSION}`);
    }

    const mainFile = path.join(tempRoot, "out", "main", "index.js");
    const source = fs.readFileSync(mainFile, "utf8");
    if (isPatched(source)) return false;

    const beforeHash = sha256(appAsar);
    const patched = patchMain(source);
    fs.writeFileSync(mainFile, patched.source, "utf8");
    await createPackage(tempRoot, patchedAsar);
    const afterHash = sha256(patchedAsar);
    const backup = backupPath(packageJson.version, beforeHash);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    if (!fs.existsSync(backup)) fs.copyFileSync(appAsar, backup, fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(patchedAsar, appAsar);
    fs.writeFileSync(statePath, JSON.stringify({
      version: LINEARCN_VERSION,
      linearVersion: packageJson.version,
      appAsar,
      backup,
      beforeHash,
      afterHash,
      repairedAt: new Date().toISOString()
    }, null, 2), "utf8");
    log(`已恢复 Linear ${packageJson.version} 的汉化注入`);
    return true;
  } finally {
    fs.rmSync(patchedAsar, { force: true });
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function claimWatcher() {
  if (fs.existsSync(lockPath)) {
    const existing = Number.parseInt(fs.readFileSync(lockPath, "utf8"), 10);
    if (Number.isInteger(existing)) {
      try {
        process.kill(existing, 0);
        return false;
      } catch {}
    }
  }
  fs.writeFileSync(lockPath, String(process.pid), "utf8");
  const release = () => {
    try {
      if (fs.readFileSync(lockPath, "utf8") === String(process.pid)) fs.rmSync(lockPath, { force: true });
    } catch {}
  };
  process.on("exit", release);
  process.on("SIGTERM", () => process.exit(0));
  process.on("SIGINT", () => process.exit(0));
  return true;
}

function runRepairSubprocess() {
  return new Promise((resolve, reject) => {
    let previousRepair = null;
    try { previousRepair = readState().repairedAt || null; } catch {}
    const child = spawn(process.execPath, [scriptPath, "--once"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("exit", code => {
      if (code !== 0) return reject(new Error(stderr.trim() || `修复进程退出码 ${code}`));
      let currentRepair = null;
      try { currentRepair = readState().repairedAt || null; } catch {}
      resolve(currentRepair !== null && currentRepair !== previousRepair);
    });
  });
}

function linearIsRunning() {
  const result = spawnSync("tasklist.exe", ["/FI", "IMAGENAME eq Linear.exe", "/FO", "CSV", "/NH"], {
    windowsHide: true,
    encoding: "utf8"
  });
  return result.status === 0 && /"Linear\.exe"/i.test(result.stdout);
}

function restartLinearAfterRepair() {
  if (!linearIsRunning()) return;
  const state = readState();
  const executable = path.join(path.dirname(path.dirname(state.appAsar)), "Linear.exe");
  if (!fs.existsSync(executable)) {
    log(`已修复，但无法定位 Linear.exe：${executable}`);
    return;
  }
  spawnSync("taskkill.exe", ["/IM", "Linear.exe", "/T"], { windowsHide: true, stdio: "ignore" });
  const deadline = Date.now() + 5000;
  while (linearIsRunning() && Date.now() < deadline) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  if (linearIsRunning()) spawnSync("taskkill.exe", ["/F", "/IM", "Linear.exe", "/T"], { windowsHide: true, stdio: "ignore" });
  const child = spawn(executable, [], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  log("已重启 Linear 以载入恢复后的汉化");
}

async function watch() {
  if (!claimWatcher()) return;
  const state = readState();
  const resources = path.dirname(path.resolve(state.appAsar));
  let timer;
  let running = false;
  const schedule = (delay = 250) => {
    clearTimeout(timer);
    timer = setTimeout(async() => {
      if (running) return schedule(1000);
      running = true;
      try {
        const changed = await runRepairSubprocess();
        if (changed) restartLinearAfterRepair();
      } catch (error) {
        log(`修复等待重试：${error.stack || error.message}`);
        schedule(1000);
      } finally {
        running = false;
      }
    }, delay);
  };
  fs.watch(resources, (event, filename) => {
    if (String(filename || "").toLowerCase() === "app.asar") schedule();
  });
  setInterval(() => schedule(0), 60_000).unref();
  schedule(0);
  log("自动维护已启动");
}

if (process.argv.includes("--watch")) await watch();
else {
  const changed = await repairOnce();
  process.stdout.write(changed ? "LinearCN 已恢复。\n" : "LinearCN 无需修复。\n");
}
