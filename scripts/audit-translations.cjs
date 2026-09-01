/**
 * Read-only semantic audit for the effective translation map.
 *
 * The report surfaces conflicts and review candidates; it never rewrites a
 * dictionary. Threshold changes must describe a quality policy, not hide debt.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ globalThis: {} });
for (const file of ["translations-base.js", "translations-enhanced.js", "translations-settings.js", "translations-settings-nested.js", "translations-integrations.js", "translations-quality.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), context, { filename: file });
}

const layers = [
  ["base", context.globalThis.LinearCNBaseEntries || []],
  ["enhanced", context.globalThis.LinearCNEnhancedEntries || []],
  ["settings", context.globalThis.LinearCNSettingsEntries || []],
  ["nestedSettings", context.globalThis.LinearCNNestedSettingsEntries || []],
  ["integrations", context.globalThis.LinearCNIntegrationEntries || []],
  ["quality", context.globalThis.LinearCNQualityEntries || []]
];

const histories = new Map();
for (const [layer, entries] of layers) {
  for (const [source, target] of entries) {
    const history = histories.get(source) || [];
    history.push({ layer, target });
    histories.set(source, history);
  }
}

const effective = new Map();
for (const [, entries] of layers) for (const entry of entries) effective.set(...entry);

const glossary = [
  { term: "issue", target: /议题/, exceptions: /issue data|security issue|problem/i },
  { term: "issues", target: /议题/, exceptions: /security issues|problem/i },
  { term: "backlog", target: /积压事项/ },
  { term: "triage", target: /分诊/ },
  { term: "agent", target: /智能体/, exceptions: /user agent/i },
  { term: "agents", target: /智能体/ },
  { term: "workspace", target: /工作区/ },
  { term: "cycle", target: /周期/ },
  { term: "cycles", target: /周期/ },
  { term: "project", target: /项目/ },
  { term: "projects", target: /项目/ },
  { term: "team", target: /团队/ },
  { term: "teams", target: /团队/ },
  { term: "status", target: /状态/ },
  { term: "statuses", target: /状态/ },
  { term: "initiative", target: /倡议/ },
  { term: "initiatives", target: /倡议/ },
  { term: "milestone", target: /里程碑/ },
  { term: "milestones", target: /里程碑/ },
  { term: "assignee", target: /负责人/ },
  { term: "label", target: /标签/ },
  { term: "labels", target: /标签/ },
  { term: "template", target: /模板/ },
  { term: "templates", target: /模板/ },
  { term: "comment", target: /评论/ },
  { term: "comments", target: /评论/ },
  { term: "notification", target: /通知/ },
  { term: "notifications", target: /通知/ },
  { term: "estimate", target: /估算/ },
  { term: "estimates", target: /估算/ }
];

const glossaryDrift = [];
const polarityRisks = [];
const untranslated = [];
for (const [source, target] of effective) {
  for (const rule of glossary) {
    const word = new RegExp(`\\b${rule.term}\\b`, "i");
    if (!word.test(source) || rule.exceptions?.test(source)) continue;
    if (!rule.target.test(target)) glossaryDrift.push({ source, target, term: rule.term });
  }

  const normalizedSource = source.trim();
  if (/^enable\b/i.test(normalizedSource) && /禁用|停用/.test(target)) {
    polarityRisks.push({ source, target, reason: "enable-to-disable" });
  }
  if (/^disable\b/i.test(normalizedSource) && /启用|开启/.test(target)) {
    polarityRisks.push({ source, target, reason: "disable-to-enable" });
  }
  if (/^add\b/i.test(normalizedSource) && /移除|删除/.test(target)) {
    polarityRisks.push({ source, target, reason: "add-to-remove" });
  }
  if (/^remove\b/i.test(normalizedSource) && /添加|新增/.test(target)) {
    polarityRisks.push({ source, target, reason: "remove-to-add" });
  }
  if (/\barchiv(?:e|ed|ing)\b/i.test(normalizedSource) && /删除/.test(target)) {
    polarityRisks.push({ source, target, reason: "archive-to-delete" });
  }
  if (/\bdelet(?:e|ed|ing)\b/i.test(normalizedSource) && /归档/.test(target)) {
    polarityRisks.push({ source, target, reason: "delete-to-archive" });
  }

  const hasEnglish = /[A-Za-z]{3,}/.test(source);
  const hasHan = /[\u3400-\u9fff]/.test(target);
  if (hasEnglish && !hasHan && source !== target) untranslated.push({ source, target });
}

const conflicts = [...histories]
  .filter(([, history]) => new Set(history.map(item => item.target)).size > 1)
  .map(([source, history]) => ({ source, history }));

const suspiciousWording = [...effective]
  .filter(([, target]) => /问题|代理|待办事项|您的|您|不能够|尚没有|应用模板/.test(target))
  .map(([source, target]) => ({ source, target }));

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    base: layers[0][1].length,
    enhanced: layers[1][1].length,
    settings: layers[2][1].length,
    quality: layers[3][1].length,
    effective: effective.size
  },
  conflicts,
  glossaryDrift,
  polarityRisks,
  untranslated,
  suspiciousWording
};

const outputPath = path.join(root, "audits", "translation-quality-audit.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
process.stdout.write(JSON.stringify({
  outputPath,
  totals: report.totals,
  conflictCount: conflicts.length,
  glossaryDriftCount: glossaryDrift.length,
  polarityRiskCount: polarityRisks.length,
  untranslatedCount: untranslated.length,
  suspiciousWordingCount: suspiciousWording.length
}, null, 2));
