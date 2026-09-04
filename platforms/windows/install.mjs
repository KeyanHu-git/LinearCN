/**
 * Update-resilient Windows desktop installer.
 *
 * It validates a structural patch point, stores rollback data outside Linear's
 * replaceable program directory, and installs a per-user repair worker.
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

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const RUN_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const RUN_VALUE = "LinearCN Maintenance";

function parseArgs(argv) {
  const args = { dryRun: false, uninstall: false, appAsar: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--dry-run") args.dryRun = true;
    else if (value === "--uninstall") args.uninstall = true;
    else if (value === "--app-asar") args.appAsar = argv[++index];
    else throw new Error(`未知参数：${value}`);
  }
  return args;
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function findAppAsar(explicitPath) {
  if (explicitPath) return path.resolve(explicitPath);
  const candidates = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs", "Linear", "resources", "app.asar"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Linear", "resources", "app.asar"),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Linear", "resources", "app.asar"),
    ...["C", "D", "E", "F", "G"].map(drive => `${drive}:\\Linear\\resources\\app.asar`)
  ].filter(Boolean).filter(candidate => fs.existsSync(candidate));
  const unique = [...new Set(candidates.map(candidate => path.resolve(candidate)))];
  if (unique.length !== 1) {
    throw new Error(`无法唯一确定 app.asar；请使用 --app-asar 指定路径。候选数量：${unique.length}`);
  }
  return unique[0];
}

function linearcnRoot() {
  if (!process.env.APPDATA) throw new Error("缺少 APPDATA，无法确定 Linear 用户数据目录");
  return path.join(process.env.APPDATA, "Linear", "extensions", "LinearCN");
}

function extensionRoot() {
  return path.join(linearcnRoot(), LINEARCN_VERSION);
}

function stateFile() {
  return path.join(linearcnRoot(), "install-state.json");
}

function copyRuntime(destination) {
  const source = path.join(scriptDir, "extension");
  if (!fs.existsSync(path.join(source, "manifest.json"))) throw new Error("安装包缺少 extension/manifest.json");
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

function copyMaintenance() {
  const destination = path.join(linearcnRoot(), "maintenance");
  const runtimeSource = path.join(scriptDir, "runtime", "node.exe");
  const modulesSource = path.join(scriptDir, "node_modules");
  if (!fs.existsSync(runtimeSource) || !fs.existsSync(path.join(modulesSource, "@electron", "asar"))) {
    throw new Error("安装包缺少自动维护运行时");
  }

  fs.mkdirSync(destination, { recursive: true });
  for (const file of ["repair.mjs", "patch-core.mjs", "package.json"]) {
    fs.copyFileSync(path.join(scriptDir, file), path.join(destination, file));
  }
  fs.mkdirSync(path.join(destination, "runtime"), { recursive: true });
  fs.copyFileSync(runtimeSource, path.join(destination, "runtime", "node.exe"));
  fs.cpSync(modulesSource, path.join(destination, "node_modules"), { recursive: true, force: true });

  const node = path.join(destination, "runtime", "node.exe");
  const repair = path.join(destination, "repair.mjs");
  const command = `"${node}" "${repair}" --watch`.replaceAll('"', '""');
  const launcher = path.join(destination, "launch-maintenance.vbs");
  fs.writeFileSync(launcher, `CreateObject("WScript.Shell").Run "${command}", 0, False\r\n`, "utf8");

  const registration = spawnSync("reg.exe", ["add", RUN_KEY, "/v", RUN_VALUE, "/t", "REG_SZ", "/d", `wscript.exe //B "${launcher}"`, "/f"], {
    windowsHide: true,
    encoding: "utf8"
  });
  if (registration.status !== 0) throw new Error(`无法注册自动维护：${registration.stderr || registration.stdout}`);
  const worker = spawn("wscript.exe", ["//B", launcher], { detached: true, stdio: "ignore", windowsHide: true });
  worker.unref();
  return destination;
}

function backupPath(linearVersion, hash) {
  return path.join(linearcnRoot(), "backups", `Linear-${linearVersion}-${hash.slice(0, 12)}.asar`);
}

async function inspectAndPatch(appAsar, dryRun) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "linearcn-install-"));
  const patchedAsar = path.join(path.dirname(appAsar), `app.asar.linearcn-next-${process.pid}`);
  try {
    await extractAll(appAsar, tempRoot);
    const packageJson = JSON.parse(fs.readFileSync(path.join(tempRoot, "package.json"), "utf8"));
    if (compareVersions(packageJson.version, MINIMUM_LINEAR_VERSION) < 0) {
      throw new Error(`Linear ${packageJson.version} 低于最低支持版本 ${MINIMUM_LINEAR_VERSION}`);
    }

    const mainFile = path.join(tempRoot, "out", "main", "index.js");
    const source = fs.readFileSync(mainFile, "utf8");
    const alreadyPatched = isPatched(source);
    const result = alreadyPatched ? { source, changed: false } : patchMain(source);
    const beforeHash = sha256(appAsar);
    const summary = {
      appAsar,
      linearVersion: packageJson.version,
      minimumLinearVersion: MINIMUM_LINEAR_VERSION,
      alreadyPatched,
      dryRun
    };
    console.log(JSON.stringify(summary, null, 2));
    if (dryRun || alreadyPatched) return { ...summary, beforeHash, afterHash: beforeHash, backup: null };

    fs.writeFileSync(mainFile, result.source, "utf8");
    await createPackage(tempRoot, patchedAsar);
    const afterHash = sha256(patchedAsar);
    const backup = backupPath(packageJson.version, beforeHash);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    if (!fs.existsSync(backup)) fs.copyFileSync(appAsar, backup, fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(patchedAsar, appAsar);
    return { ...summary, beforeHash, afterHash, backup };
  } finally {
    fs.rmSync(patchedAsar, { force: true });
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function install(args) {
  if (process.platform !== "win32") throw new Error("此安装器仅支持 Windows；其他系统请使用浏览器包或 Userscript");
  const appAsar = findAppAsar(args.appAsar);
  if (!fs.existsSync(appAsar) || path.basename(appAsar).toLowerCase() !== "app.asar") {
    throw new Error(`app.asar 路径无效：${appAsar}`);
  }

  const result = await inspectAndPatch(appAsar, args.dryRun);
  if (args.dryRun) return;
  copyRuntime(extensionRoot());
  const maintenance = copyMaintenance();

  if (!result.alreadyPatched) {
    fs.writeFileSync(stateFile(), JSON.stringify({
      version: LINEARCN_VERSION,
      linearVersion: result.linearVersion,
      appAsar,
      backup: result.backup,
      beforeHash: result.beforeHash,
      afterHash: result.afterHash,
      installedAt: new Date().toISOString()
    }, null, 2), "utf8");
  } else if (!fs.existsSync(stateFile())) {
    throw new Error("检测到已有补丁，但缺少安装状态；无法建立可靠回滚点");
  }
  console.log(`安装完成，自动维护已启用：${maintenance}`);
}

function stopMaintenance() {
  spawnSync("reg.exe", ["delete", RUN_KEY, "/v", RUN_VALUE, "/f"], { windowsHide: true, encoding: "utf8" });
  const pidFile = path.join(linearcnRoot(), "maintenance", "watch.pid");
  if (fs.existsSync(pidFile)) {
    const pid = Number.parseInt(fs.readFileSync(pidFile, "utf8"), 10);
    if (Number.isInteger(pid)) {
      try { process.kill(pid); } catch {}
    }
  }
}

function uninstall() {
  const statePath = stateFile();
  if (!fs.existsSync(statePath)) throw new Error("未找到安装状态，无法自动回滚");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const appAsar = path.resolve(state.appAsar);
  const backup = path.resolve(state.backup);
  if (!fs.existsSync(appAsar) || !fs.existsSync(backup)) throw new Error("当前程序或回滚备份不存在");
  if (sha256(appAsar) !== state.afterHash || sha256(backup) !== state.beforeHash) {
    throw new Error("当前 Linear 与安装记录不一致，拒绝恢复错误版本");
  }
  stopMaintenance();
  fs.copyFileSync(backup, appAsar);
  console.log("已恢复当前 Linear 的原始 app.asar，并停用自动维护。");
}

const args = parseArgs(process.argv.slice(2));
if (args.uninstall) uninstall();
else await install(args);
