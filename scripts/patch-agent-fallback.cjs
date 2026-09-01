/**
 * One-time migration for desktop loaders created before Agent fallback existed.
 * The exact marker and unique patch point make repeat execution idempotent and
 * unknown desktop builds fail closed.
 */
const fs = require("node:fs");

const file = process.argv[2];
if (!file) throw new Error("Usage: node patch-agent-fallback.cjs <main-index.js>");

const source = fs.readFileSync(file, "utf8");
const marker = "LinearCN Agent fallback registered";
if (source.includes(marker)) {
  process.stdout.write("Agent fallback is already patched");
  process.exit(0);
}

const needle = "catch(e){X.error(`Failed to load LinearCN extension`,e,void 0,{logToDisk:!0})}Wj=";
const injection = [
  "catch(e){X.error(`Failed to load LinearCN extension`,e,void 0,{logToDisk:!0})}",
  "try{",
  "let e=t.join(r.app.getPath(`userData`),`extensions`,`LinearCN`,`1.0.0`,`js`,`agent-fallback.js`),",
  "n=c.readFileSync(e,`utf8`),",
  "i=e=>{",
  "let t=()=>{e.isDestroyed()||e.executeJavaScript(n,!0).catch(e=>X.warn(`LinearCN Agent fallback injection failed`,e))};",
  "e.on(`dom-ready`,t),e.on(`did-navigate-in-page`,t),e.getURL()&&setTimeout(t,0)",
  "};",
  "r.app.on(`web-contents-created`,(e,t)=>i(t)),",
  "r.webContents.getAllWebContents().forEach(i),",
  "X.info(`LinearCN Agent fallback registered`,{logToDisk:!0})",
  "}catch(e){X.error(`Failed to register LinearCN Agent fallback`,e,void 0,{logToDisk:!0})}",
  "Wj="
].join("");

const count = source.split(needle).length - 1;
if (count !== 1) throw new Error(`Expected one fallback patch point, found ${count}`);
fs.writeFileSync(file, source.replace(needle, injection), "utf8");
