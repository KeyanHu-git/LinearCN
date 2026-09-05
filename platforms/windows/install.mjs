/**
 * Desktop installer: validate payload, prepare maintenance, commit the archive,
 * then enable the supervised task. Runtime and backups remain in user data.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { acquireLock, applyArchive, hash, readJson, writeJson, recover } from "./archive.mjs";
import { LINEARCN_VERSION } from "./patch-core.mjs";
const source = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(process.env.APPDATA || "", "Linear", "extensions", "LinearCN");
const maintenance = path.join(root, "maintenance");
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--app-asar") { if (!args[++i]) throw new Error("缺少 app.asar 路径"); }
  else if (!["--uninstall", "--dry-run"].includes(args[i])) throw new Error("未知参数：" + args[i]);
}
function powershell(script, ...extra) {
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, ...extra], { windowsHide: true, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || "维护任务操作失败");
}
function assertClosed(appAsar) {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    "Get-CimInstance Win32_Process -Filter \"Name='Linear.exe'\" | Select-Object -ExpandProperty ExecutablePath | ConvertTo-Json -Compress"], { windowsHide: true, encoding: "utf8" });
  if (result.status !== 0) throw new Error("无法检查 Linear 运行状态");
  const exe = path.resolve(path.dirname(appAsar), "..", "Linear.exe").toLowerCase();
  if ([JSON.parse(result.stdout.trim() || "[]")].flat().some(x => typeof x === "string" && path.resolve(x).toLowerCase() === exe)) {
    throw new Error("请完全退出 Linear 后再安装");
  }
  return true;
}
function findArchive() {
  const i = args.indexOf("--app-asar");
  if (i >= 0) return path.resolve(args[i + 1]);
  const saved = readJson(path.join(root, "install-state.json"));
  if (saved && fs.existsSync(saved.appAsar)) return path.resolve(saved.appAsar);
  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Linear", "resources", "app.asar"),
    path.join(process.env.LOCALAPPDATA || "", "Linear", "resources", "app.asar"),
    path.join(process.env.ProgramFiles || "", "Linear", "resources", "app.asar"),
    ...["C", "D", "E", "F", "G"].map(d => d + ":\\Linear\\resources\\app.asar")
  ].filter(p => fs.existsSync(p));
  if (new Set(candidates).size !== 1) throw new Error("请用 --app-asar 指定 Linear 的 app.asar");
  return candidates[0];
}
const files = ["repair.mjs", "archive.mjs", "patch-core.mjs", "package.json", "register-maintenance.ps1", "run-maintenance.ps1"];
function validatePayload() {
  for (const f of [...files, "runtime/node.exe", "node_modules/@electron/asar/package.json", "extension/manifest.json", "extension/js/agent-fallback.js"]) {
    if (!fs.existsSync(path.join(source, f))) throw new Error("安装包缺少：" + f);
  }
  const manifest = readJson(path.join(source, "extension", "manifest.json"));
  if (manifest.version !== LINEARCN_VERSION) throw new Error("扩展版本与安装器不一致");
  for (const cs of manifest.content_scripts) for (const js of cs.js || []) {
    if (!fs.existsSync(path.join(source, "extension", js))) throw new Error("扩展缺少脚本：" + js);
  }
}
function prepare() {
  fs.mkdirSync(maintenance, { recursive: true });
  for (const f of files) fs.copyFileSync(path.join(source, f), path.join(maintenance, f));
  for (const d of ["runtime", "node_modules"]) fs.cpSync(path.join(source, d), path.join(maintenance, d), { recursive: true });
  fs.cpSync(path.join(source, "extension"), path.join(root, LINEARCN_VERSION), { recursive: true });
  const command = '"' + path.join(maintenance, "runtime", "node.exe") + '" "' + path.join(maintenance, "repair.mjs") + '" --launch';
  fs.writeFileSync(path.join(root, "LinearCN.vbs"), 'CreateObject("WScript.Shell").Run "' + command.replaceAll('"', '""') + '", 0, False\r\n');
}
if (process.platform !== "win32" || !process.env.APPDATA) throw new Error("此安装器需要 Windows 用户环境");
const appAsar = findArchive();
if (args.includes("--dry-run")) {
  console.log(JSON.stringify(await applyArchive(root, appAsar, { dryRun: true }), null, 2));
} else {
  assertClosed(appAsar);
  if (!args.includes("--uninstall")) validatePayload();
  if (!args.includes("--uninstall")) await applyArchive(root, appAsar, { dryRun: true });
  // The exact maintenance path is checked by the stop script, never a bare PID.
  powershell(path.join(source, "register-maintenance.ps1"), "-Remove");
  fs.mkdirSync(root, { recursive: true });
  const unlock = await acquireLock(root);
  try {
    if (args.includes("--uninstall")) {
      recover(root, appAsar);
      const state = readJson(path.join(root, "install-state.json"));
      if (!state || state.appAsar !== appAsar || hash(appAsar) !== state.afterHash || hash(state.backup) !== state.beforeHash) throw new Error("回滚版本或校验和不匹配");
      const next = appAsar + ".linearcn-restore";
      fs.copyFileSync(state.backup, next);
      assertClosed(appAsar);
      fs.renameSync(next, appAsar);
      writeJson(path.join(root, "install-state.json"), { ...state, uninstalled: true });
      console.log("已恢复原始程序并停用维护任务。");
    } else {
      await applyArchive(root, appAsar, { dryRun: true });
      prepare();
      const result = await applyArchive(root, appAsar, { canWrite: () => assertClosed(appAsar) });
      if (!readJson(path.join(root, "install-state.json"))) throw new Error("缺少可验证的安装状态");
      powershell(path.join(maintenance, "register-maintenance.ps1"));
      const started = spawnSync("schtasks.exe", ["/Run", "/TN", "LinearCN Maintenance"], { windowsHide: true, encoding: "utf8" });
      if (started.status !== 0) throw new Error("汉化已安装，但维护任务未能启动：" + started.stderr);
      console.log(JSON.stringify({ ...result, maintenance: "scheduled", launcher: path.join(root, "LinearCN.vbs") }, null, 2));
    }
  } finally { unlock(); }
}
