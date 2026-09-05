/** Supervised maintenance: repair only while Linear is closed; launch after repair. */
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { acquireLock, applyArchive, hash, readJson, writeJson } from "./archive.mjs";

export function linearRunning(appAsar) {
  const executable = path.resolve(path.dirname(appAsar), "..", "Linear.exe");
  // Query full executable paths. Never stop a process by its name or a stale PID.
  const script = "Get-CimInstance Win32_Process -Filter \"Name='Linear.exe'\" | Select-Object -ExpandProperty ExecutablePath | ConvertTo-Json -Compress";
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, encoding: "utf8" });
  if (r.status !== 0) throw new Error("无法检查 Linear 运行状态");
  const rows = r.stdout.trim() ? JSON.parse(r.stdout) : [];
  return [rows].flat().some(value => typeof value === "string" && path.resolve(value).toLowerCase() === executable.toLowerCase());
}
const args = process.argv.slice(2);
const index = args.indexOf("--root");
const root = index >= 0 ? path.resolve(args[index + 1]) : path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const stateFile = path.join(root, "install-state.json");
const healthFile = path.join(root, "maintenance", "health.json");
function health(status, detail) {
  fs.mkdirSync(path.dirname(healthFile), { recursive: true });
  writeJson(healthFile, { status, detail, checkedAt: new Date().toISOString(), pid: process.pid });
}
export async function check() {
  const release = await acquireLock(root);
  try {
    const state = readJson(stateFile);
    if (!state) throw new Error("缺少安装状态");
    if (state.uninstalled) { health("disabled", "汉化已卸载"); return; }
    if (linearRunning(state.appAsar)) {
      const current = hash(state.appAsar);
      const status = current === state.afterHash ? "running" : "waiting-for-exit";
      health(status, status === "running" ? "程序包与安装记录一致" : "Linear 退出后自动恢复汉化");
      return;
    }
    const result = await applyArchive(root, state.appAsar, { canWrite: () => !linearRunning(state.appAsar) });
    health(result.changed ? "repaired" : "ready", result);
    if (args.includes("--launch")) {
      const executable = path.resolve(path.dirname(state.appAsar), "..", "Linear.exe");
      const child = spawn(executable, [], { detached: true, stdio: "ignore", windowsHide: false });
      child.unref();
    }
  } finally { release(); }
}
async function tick() {
  try {
    for (let attempt = 0; ; attempt++) {
      try { await check(); break; }
      catch (error) {
        if (error.code !== "EADDRINUSE" || !args.includes("--launch") || attempt >= 20) throw error;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  catch (error) {
    if (error.code !== "EADDRINUSE") health("error", error.message);
    if (!args.includes("--watch")) throw error;
  }
}
if (args.includes("--watch")) {
  let release;
  try { release = await acquireLock(root + "-watch"); }
  catch (error) { if (error.code === "EADDRINUSE") process.exit(0); throw error; }
  process.on("exit", release);
  for (;;) {
    await tick();
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
} else await tick();
