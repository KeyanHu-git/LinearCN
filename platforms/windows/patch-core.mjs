/**
 * Version-tolerant Linear desktop patching primitives.
 *
 * The patch is anchored to Linear's ready handler instead of minified symbol
 * names, and it proceeds only when exactly one compatible insertion point is
 * present.
 */
export const LINEARCN_VERSION = "1.0.0";
export const MINIMUM_LINEAR_VERSION = "1.32.2";
export const PATCH_MARKER = `LinearCN ${LINEARCN_VERSION} loaded`;

const READY_HANDLER = /([A-Za-z_$][\w$]*)\.app\.on\(`ready`,async\(\)=>\{if\(!await [A-Za-z_$][\w$]*\(\)\)\{/g;

export function compareVersions(left, right) {
  const normalize = value => String(value).split(".").map(part => Number.parseInt(part, 10) || 0);
  const a = normalize(left);
  const b = normalize(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function isPatched(source) {
  return source.includes(PATCH_MARKER);
}

export function patchMain(source) {
  if (isPatched(source)) return { source, changed: false };

  const matches = [...source.matchAll(READY_HANDLER)];
  if (matches.length !== 1) {
    throw new Error(`不支持的 Linear 构建：桌面启动补丁点数量为 ${matches.length}`);
  }

  const electron = matches[0][1];
  const loader = [
    "try{",
    "let e=require(`path`),t=",
    electron,
    ".session.defaultSession,n=t.extensions?.loadExtension?t.extensions.loadExtension.bind(t.extensions):t.loadExtension.bind(t);",
    "await n(e.join(",
    electron,
    `.app.getPath(\`userData\`),\`extensions\`,\`LinearCN\`,\`${LINEARCN_VERSION}\`)),`,
    `console.info(\`${PATCH_MARKER}\`)`,
    "}catch(e){console.error(`Failed to load LinearCN extension`,e)}",
    "try{",
    "let e=require(`path`).join(",
    electron,
    `.app.getPath(\`userData\`),\`extensions\`,\`LinearCN\`,\`${LINEARCN_VERSION}\`,\`js\`,\`agent-fallback.js\`),`,
    "t=require(`fs`).readFileSync(e,`utf8`),n=e=>{",
    "let t=()=>{e.isDestroyed()||e.executeJavaScript(n,!0).catch(e=>console.warn(`LinearCN fallback injection failed`,e))};",
    "e.on(`dom-ready`,t),e.on(`did-navigate-in-page`,t),e.getURL()&&setTimeout(t,0)};",
    electron,
    ".app.on(`web-contents-created`,(e,t)=>n(t)),",
    electron,
    ".webContents.getAllWebContents().forEach(n),",
    "console.info(`LinearCN Agent fallback registered`)",
    "}catch(e){console.error(`Failed to register LinearCN Agent fallback`,e)}"
  ].join("");

  const match = matches[0];
  const insertion = match.index + match[0].length;
  return {
    source: source.slice(0, insertion) + loader + source.slice(insertion),
    changed: true
  };
}
