/** Contract tests for version-tolerant Windows desktop injection. */
import assert from "node:assert/strict";
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
