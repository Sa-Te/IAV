#!/usr/bin/env node
/**
 * AGENTS.md §8 as a build gate.
 *
 * The tokens package is the only place a colour value may be written. Everywhere
 * else, a raw hex literal, an arbitrary Tailwind value (`bg-[#123]`, `p-[13px]`)
 * or a gradient utility is a design-system escape hatch, and escape hatches are
 * how a palette stops being a palette.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SCAN = [join(ROOT, "apps/web/src"), join(ROOT, "apps/web/index.html")];
const ALLOWED = join(ROOT, "packages/tokens");
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".html"]);

const RULES = [
  {
    name: "raw hex literal",
    pattern: /#[0-9a-fA-F]{3,8}\b/,
    hint: "use a token from @instavault/tokens",
  },
  {
    name: "arbitrary Tailwind value",
    pattern: /\b[a-z][a-z0-9-]*-\[[^\]\s]+\]/,
    hint: "use a token-backed utility or a token in CSS",
  },
  {
    name: "gradient",
    pattern: /\b(bg-gradient-to-[a-z]+|bg-linear-to-[a-z]+|bg-radial|bg-conic)\b|gradient\(/,
    hint: "gradients are banned by AGENTS §8",
  },
];

function walk(path, out = []) {
  let stats;
  try {
    stats = statSync(path);
  } catch {
    return out;
  }
  if (stats.isDirectory()) {
    if (path.startsWith(ALLOWED)) return out;
    for (const entry of readdirSync(path)) walk(join(path, entry), out);
  } else if (EXTENSIONS.has(path.slice(path.lastIndexOf(".")))) {
    out.push(path);
  }
  return out;
}

const files = SCAN.flatMap((target) => walk(target));
const violations = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relative(ROOT, file),
          line: index + 1,
          rule: rule.name,
          hint: rule.hint,
          text: line.trim().slice(0, 100),
        });
      }
    }
  });
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}  ${violation.rule} — ${violation.hint}`);
    console.error(`    ${violation.text}`);
  }
  console.error(`\ncheck:styles found ${violations.length} violation(s).`);
  process.exit(1);
}

console.log(`check:styles — ${files.length} files, no raw hex, no arbitrary values, no gradients.`);
