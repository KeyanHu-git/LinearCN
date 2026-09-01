const fs = require("node:fs");

const file = process.argv[2];
if (!file) throw new Error("Usage: node patch-linear-loader-version.cjs <main-index.js>");

const source = fs.readFileSync(file, "utf8");
const oldPaths = [
  "`extensions`,`LinearCN`,`1.2.0`",
  "`extensions`,`LinearCN`,`1.3.0`",
  "`extensions`,`LinearCN`,`1.4.0`",
  "`extensions`,`LinearCN`,`1.5.0`",
  "`extensions`,`LinearCN`,`1.5.1`",
  "`extensions`,`LinearCN`,`1.5.2`"
];
const newPath = "`extensions`,`LinearCN`,`1.5.3`";
const oldLogs = [
  "LinearCN 1.2.0 loaded",
  "LinearCN Enhanced 1.3.0 loaded",
  "LinearCN Enhanced 1.4.0 loaded",
  "LinearCN Enhanced 1.5.0 loaded",
  "LinearCN Enhanced 1.5.1 loaded",
  "LinearCN Enhanced 1.5.2 loaded"
];
const newLog = "LinearCN Enhanced 1.5.3 loaded";

let patched = source;
const matchedOldPaths = oldPaths.filter(marker => patched.includes(marker));
if (matchedOldPaths.length === 1) patched = patched.replace(matchedOldPaths[0], newPath);
else if (matchedOldPaths.length > 1) throw new Error(`Found multiple old loader paths: ${matchedOldPaths.join(", ")}`);

const newPathCount = patched.split(newPath).length - 1;
if (newPathCount !== 1) throw new Error(`Expected one enhanced loader path, found ${newPathCount}`);

const matchedOldLogs = oldLogs.filter(marker => patched.includes(marker));
if (matchedOldLogs.length === 1) patched = patched.replace(matchedOldLogs[0], newLog);
else if (matchedOldLogs.length > 1) throw new Error(`Found multiple old loader logs: ${matchedOldLogs.join(", ")}`);
if ((patched.split(newLog).length - 1) !== 1) throw new Error("Expected one 1.5.3 loader log marker");

fs.writeFileSync(file, patched, "utf8");
