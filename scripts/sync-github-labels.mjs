/**
 * Repository label reconciler.
 *
 * `.github/labels.json` is the source of truth. Existing default labels are
 * renamed through aliases; unrelated labels are preserved to avoid destructive
 * synchronization. `--check` validates the taxonomy without network access.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitions = JSON.parse(fs.readFileSync(path.join(root, ".github", "labels.json"), "utf8"));
const allowedAxes = new Set(["type", "area", "status", "priority", "community"]);

function validate(items) {
  const names = new Set();
  const aliases = new Set();
  for (const item of items) {
    if (!/^[a-z]+:[a-z0-9-]+$/.test(item.name)) throw new Error(`标签名称不符合 axis:value 格式：${item.name}`);
    if (!allowedAxes.has(item.name.split(":", 1)[0])) throw new Error(`未知标签轴：${item.name}`);
    if (!/^[0-9A-F]{6}$/i.test(item.color)) throw new Error(`标签颜色无效：${item.name}`);
    if (!item.description || item.description.length > 100) throw new Error(`标签说明为空或过长：${item.name}`);
    const key = item.name.toLowerCase();
    if (names.has(key)) throw new Error(`标签名称重复：${item.name}`);
    names.add(key);
  }
  for (const item of items) {
    for (const alias of item.aliases || []) {
      const key = alias.toLowerCase();
      if (names.has(key) || aliases.has(key)) throw new Error(`标签别名冲突：${alias}`);
      aliases.add(key);
    }
  }
}

validate(definitions);
if (process.argv.includes("--check")) {
  console.log(`label taxonomy valid: ${definitions.length} labels`);
  process.exit(0);
}

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repository || !token) throw new Error("同步标签需要 GITHUB_REPOSITORY 与 GITHUB_TOKEN");

const apiRoot = `https://api.github.com/repos/${repository}`;
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "LinearCN-label-sync"
};

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (!response.ok) throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}

const existing = [];
for (let page = 1; ; page += 1) {
  const batch = await request(`${apiRoot}/labels?per_page=100&page=${page}`);
  existing.push(...batch);
  if (batch.length < 100) break;
}

const byName = new Map(existing.map(label => [label.name.toLowerCase(), label]));
const summary = { created: [], updated: [], unchanged: [] };

for (const definition of definitions) {
  const exact = byName.get(definition.name.toLowerCase());
  const alias = (definition.aliases || []).map(name => byName.get(name.toLowerCase())).find(Boolean);
  const current = exact || alias;
  const payload = JSON.stringify({
    new_name: definition.name,
    color: definition.color.toLowerCase(),
    description: definition.description
  });

  if (!current) {
    await request(`${apiRoot}/labels`, { method: "POST", body: payload, headers: { "Content-Type": "application/json" } });
    summary.created.push(definition.name);
    continue;
  }

  const changed = current.name !== definition.name
    || current.color.toLowerCase() !== definition.color.toLowerCase()
    || (current.description || "") !== definition.description;
  if (!changed) {
    summary.unchanged.push(definition.name);
    continue;
  }

  await request(`${apiRoot}/labels/${encodeURIComponent(current.name)}`, {
    method: "PATCH",
    body: payload,
    headers: { "Content-Type": "application/json" }
  });
  summary.updated.push(definition.name);
}

console.log(JSON.stringify(summary, null, 2));
