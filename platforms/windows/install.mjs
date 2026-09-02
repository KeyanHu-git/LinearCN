/**
 * Fail-closed Windows desktop installer.
 *
 * The installer validates the Linear version and one exact patch point, creates
 * a non-overwriting backup, records hashes, and keeps rollback state beside the
 * installed runtime. It never distributes Linear application code.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPackage, extractAll } from "@electron/asar";

const VERSION = "1.0.0";
const SUPPORTED_LINEAR_VERSION = "1.32.2";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

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

function extensionRoot() {
  if (!process.env.APPDATA) throw new Error("缺少 APPDATA，无法确定 Linear 用户数据目录");
  return path.join(process.env.APPDATA, "Linear", "extensions", "LinearCN", VERSION);
}

function stateFile() {
  return path.join(path.dirname(extensionRoot()), "install-state.json");
}

function copyRuntime(destination) {
  const source = path.join(scriptDir, "extension");
  if (!fs.existsSync(path.join(source, "manifest.json"))) throw new Error("安装包缺少 extension/manifest.json");
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

function patchMain(source) {
  if (source.includes("LinearCN Enhanced") || source.includes("LinearCN 1.0.0 loaded")) {
    throw new Error("检测到现有 LinearCN 补丁；请先回滚旧版本");
  }
  const needle = "if(!await UO()){Wj=";
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`不支持的 Linear 构建：补丁点数量为 ${count}`);
  const loader = [
    "if(!await UO()){",
    "try{let e=r.session.defaultSession,n=e.extensions?.loadExtension?e.extensions.loadExtension.bind(e.extensions):e.loadExtension.bind(e);",
    "await n(t.join(r.app.getPath(`userData`),`extensions`,`LinearCN`,`1.0.0`)),",
    "X.info(`LinearCN 1.0.0 loaded`,{logToDisk:!0})}",
    "catch(e){X.error(`Failed to load LinearCN extension`,e,void 0,{logToDisk:!0})}",
    "try{let e=t.join(r.app.getPath(`userData`),`extensions`,`LinearCN`,`1.0.0`,`js`,`agent-fallback.js`),",
    "n=c.readFileSync(e,`utf8`),i=e=>{let t=()=>{e.isDestroyed()||e.executeJavaScript(n,!0).catch(e=>X.warn(`LinearCN fallback injection failed`,e))};",
    "e.on(`dom-ready`,t),e.on(`did-navigate-in-page`,t),e.getURL()&&setTimeout(t,0)};",
    "r.app.on(`web-contents-created`,(e,t)=>i(t)),r.webContents.getAllWebContents().forEach(i),",
    "X.info(`LinearCN Agent fallback registered`,{logToDisk:!0})}",
    "catch(e){X.error(`Failed to register LinearCN Agent fallback`,e,void 0,{logToDisk:!0})}",
    "Wj="
  ].join("");
  return source.replace(needle, loader);
}

async function install(args) {
  if (process.platform !== "win32") throw new Error("此安装器仅支持 Windows；其他系统请使用浏览器包或 Userscript");
  const appAsar = findAppAsar(args.appAsar);
  if (!fs.existsSync(appAsar) || path.basename(appAsar).toLowerCase() !== "app.asar") {
    throw new Error(`app.asar 路径无效：${appAsar}`);
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "linearcn-"));
  try {
    extractAll(appAsar, tempRoot);
    const packageJson = JSON.parse(fs.readFileSync(path.join(tempRoot, "package.json"), "utf8"));
    if (packageJson.version !== SUPPORTED_LINEAR_VERSION) {
      throw new Error(`仅支持 Linear ${SUPPORTED_LINEAR_VERSION}，检测到 ${packageJson.version}`);
    }
    const mainFile = path.join(tempRoot, "out", "main", "index.js");
    const patched = patchMain(fs.readFileSync(mainFile, "utf8"));
    fs.writeFileSync(mainFile, patched, "utf8");
    const patchedAsar = path.join(os.tmpdir(), `linearcn-app-${process.pid}.asar`);
    await createPackage(tempRoot, patchedAsar);
    const beforeHash = sha256(appAsar);
    const afterHash = sha256(patchedAsar);

    console.log(JSON.stringify({ appAsar, linearVersion: packageJson.version, beforeHash, afterHash, dryRun: args.dryRun }, null, 2));
    if (args.dryRun) {
      fs.rmSync(patchedAsar, { force: true });
      return;
    }

    const runtimeDestination = extensionRoot();
    copyRuntime(runtimeDestination);
    const backup = `${appAsar}.linearcn-backup-${VERSION}`;
    if (fs.existsSync(backup)) throw new Error(`备份已存在，拒绝覆盖：${backup}`);
    fs.copyFileSync(appAsar, backup, fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(patchedAsar, appAsar);
    fs.rmSync(patchedAsar, { force: true });
    fs.writeFileSync(stateFile(), JSON.stringify({ version: VERSION, appAsar, backup, beforeHash, afterHash }, null, 2), "utf8");
    console.log("安装完成。请启动 Linear。");
  } finally {
    const resolvedTemp = fs.realpathSync(tempRoot);
    const resolvedSystemTemp = fs.realpathSync(os.tmpdir());
    if (!resolvedTemp.startsWith(resolvedSystemTemp + path.sep)) throw new Error("临时目录校验失败，未清理");
    fs.rmSync(resolvedTemp, { recursive: true, force: true });
  }
}

function uninstall() {
  const statePath = stateFile();
  if (!fs.existsSync(statePath)) throw new Error("未找到安装状态，无法自动回滚");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const appAsar = path.resolve(state.appAsar);
  const backup = path.resolve(state.backup);
  if (path.dirname(appAsar) !== path.dirname(backup)) throw new Error("备份路径不在 app.asar 同一目录，拒绝回滚");
  if (!fs.existsSync(backup)) throw new Error(`备份不存在：${backup}`);
  fs.copyFileSync(backup, appAsar);
  console.log("已恢复原始 app.asar。扩展运行文件保留，可手动删除。");
}

const args = parseArgs(process.argv.slice(2));
if (args.uninstall) uninstall();
else await install(args);
