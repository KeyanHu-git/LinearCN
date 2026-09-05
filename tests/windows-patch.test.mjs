/** Contract tests for version-tolerant Windows desktop injection. */
import assert from "node:assert/strict";
import vm from "node:vm";
import { compareVersions, isPatched, patchMain, PATCH_MARKER } from "../platforms/windows/patch-core.mjs";

const oldBuild = "prefix;r.app.on(`ready`,async()=>{if(!await UO()){Wj=setup()}});suffix";
const newBuild = "prefix;r.app.on(`ready`,async()=>{if(!await YO()){Jj=setup()}});suffix";

for (const fixture of [oldBuild, newBuild]) {
  const patched = patchMain(fixture);
  assert.equal(patched.changed, true);
  assert.equal(isPatched(patched.source), true);
  assert.ok(patched.source.includes(PATCH_MARKER));
  assert.equal(patchMain(patched.source).changed, false, "patching must be idempotent");
}

assert.throws(() => patchMain("no compatible ready handler"), /补丁点数量为 0/);
assert.throws(() => patchMain(oldBuild + newBuild), /补丁点数量为 2/);
assert.equal(compareVersions("1.32.3", "1.32.2"), 1);
assert.equal(compareVersions("1.32.2", "1.32.2"), 0);
assert.equal(compareVersions("1.31.9", "1.32.2"), -1);

console.log("windows patch tests passed");

// Execute the generated loader, including delayed navigation callbacks.
for (const failedExtension of [false, true]) {
  const callbacks = new Map();
  const executions = [];
  const fallback = "globalThis.linearcnFallbackExecuted = true";
  let currentURL = "https://linear.app/workspace";
  let ready;
  const contents = {
    on(event, fn) { callbacks.set(event, fn); },
    isDestroyed: () => false,
    getURL: () => currentURL,
    executeJavaScript(script) { assert.equal(typeof script, "string"); executions.push(script); return Promise.resolve(); }
  };
  const electron = {
    app: { on(event, fn) { if (event === "ready") ready = fn; }, getPath: () => "userData" },
    session: { defaultSession: { async loadExtension() { if (failedExtension) throw new Error("fixture"); } } },
    webContents: { getAllWebContents: () => [contents] }
  };
  const source = "r.app.on(`ready`,async()=>{if(!await gate()){}})";
  vm.runInNewContext(patchMain(source).source, {
    r: electron, gate: async() => false, URL,
    require: name => name === "path" ? { join: (...parts) => parts.join("/") } : { readFileSync: () => fallback, writeFileSync() {} },
    setTimeout: fn => fn(), console: { info() {}, error() {}, warn() {} }
  });
  await ready();
  callbacks.get("dom-ready")();
  assert.deepEqual(executions, [fallback, fallback]);
  currentURL = "https://linear.app.example.org";
  callbacks.get("did-navigate-in-page")();
  assert.equal(executions.length, 2, "external pages must not receive the fallback");
}
console.log("desktop loader execution tests passed");
