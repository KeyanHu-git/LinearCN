/**
 * Version-tolerant Linear desktop patching primitives.
 *
 * The patch is anchored to Linear's ready handler instead of minified symbol
 * names, and it proceeds only when exactly one compatible insertion point is
 * present.
 */
export const LINEARCN_VERSION = "1.0.1";
export const MINIMUM_LINEAR_VERSION = "1.32.2";
export const PATCH_MARKER = `LinearCN ${LINEARCN_VERSION} loaded (loader-2)`;

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
  if (/LinearCN.*loaded|LinearCN Enhanced/.test(source)) {
    throw new Error("已有旧版补丁，需要从已验证的原始备份升级");
  }

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
    `console.info(\`${PATCH_MARKER}\`);`,
    "require(`fs`).writeFileSync(e.join(",
    electron,
    `.app.getPath(\`userData\`),\`extensions\`,\`LinearCN\`,\`loader-status.json\`),JSON.stringify({version:\`${LINEARCN_VERSION}\`,loadedAt:new Date().toISOString()}))`,
    "}catch(e){console.error(`Failed to load LinearCN extension`,e)}",
    "try{",
    "let e=require(`path`).join(",
    electron,
    `.app.getPath(\`userData\`),\`extensions\`,\`LinearCN\`,\`${LINEARCN_VERSION}\`,\`js\`,\`agent-fallback.js\`),`,
    "script=require(`fs`).readFileSync(e,`utf8`),n=contents=>{",
    "let inject=()=>{if(contents.isDestroyed())return;let url;try{url=new URL(contents.getURL())}catch{return}if(url.protocol!==`https:`||!(url.hostname===`linear.app`||url.hostname.endsWith(`.linear.app`)))return;",
    "contents.executeJavaScript(script,!0).catch(e=>console.warn(`LinearCN fallback injection failed`,e))};",
    "contents.on(`dom-ready`,inject),contents.on(`did-navigate-in-page`,inject),contents.getURL()&&setTimeout(inject,0)};",
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
