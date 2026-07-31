#!/usr/bin/env node
// server/scripts/syntax-check.js
//
// Recursively runs `node --check` on every .js file under src/. Pure Node,
// no shell globbing — works identically via npm scripts on Windows (cmd.exe),
// macOS/Linux, and CI. Exists because two syntax errors once sat committed
// on main with nothing to catch them until someone ran the server locally.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SRC_DIR = path.join(__dirname, "..", "src");

function collectJsFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      acc.push(full);
    }
  }
  return acc;
}

const files = collectJsFiles(SRC_DIR);
let failed = false;

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    failed = true;
    console.error(`❌ Syntax error in ${path.relative(process.cwd(), file)}`);
    console.error(err.stderr?.toString() || err.message);
  }
}

if (failed) {
  process.exit(1);
}
console.log(`✅ Syntax OK — checked ${files.length} files under src/`);
