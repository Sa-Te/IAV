#!/usr/bin/env node
/**
 * File-size check for AGENTS.md §5: a file over ~250 lines is a signal to examine
 * responsibilities; over 400 it fails the build.
 *
 * Warns above 250, fails above 400. Prints the report either way, so the check is
 * useful when it passes too.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const WARN = 250;
const FAIL = 400;

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".git",
  ".next",
  "reference-backend",
  "reference-frontend",
  "archive",
]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|css)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = [];
for (const top of ["apps", "packages"]) {
  walk(join(ROOT, top), files);
}

const rows = files
  .map((file) => {
    const lines = readFileSync(file, "utf8").split("\n").length;
    return { rel: relative(ROOT, file), lines };
  })
  .sort((a, b) => b.lines - a.lines);

if (rows.length === 0) {
  console.error("filesize: no source files found");
  process.exit(1);
}

const failures = rows.filter((r) => r.lines > FAIL);
const warnings = rows.filter((r) => r.lines > WARN && r.lines <= FAIL);

const width = Math.max(...rows.map((r) => r.rel.length));
for (const row of rows) {
  const flag = row.lines > FAIL ? "FAIL" : row.lines > WARN ? "warn" : "ok  ";
  console.log(`${flag} ${String(row.lines).padStart(5)}  ${row.rel.padEnd(width)}`);
}

console.log(
  `\nfilesize: ${rows.length} file(s), ${warnings.length} warning(s), ${failures.length} failure(s)`,
);

if (failures.length > 0) {
  for (const f of failures) {
    console.error(`  ${f.rel}: ${f.lines} lines exceeds the ${FAIL}-line limit`);
  }
  process.exit(1);
}
