#!/usr/bin/env node
/**
 * AGENTS.md §8 as a build gate.
 *
 * The tokens package is the only place a colour value may be written. Everywhere
 * else, a raw hex literal or a gradient is a design-system escape hatch, and escape
 * hatches are how a palette stops being a palette.
 *
 * There is no utility framework (M25), so there is no "arbitrary Tailwind value" to
 * ban. The old rule was dropped rather than reworded into something that no longer
 * meant anything. A Tailwind directive is still refused so the framework cannot
 * quietly return through a stylesheet.
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
    name: "gradient",
    pattern: /\b(bg-gradient-to-[a-z]+|bg-linear-to-[a-z]+|bg-radial|bg-conic)\b|gradient\(/,
    hint: "gradients are banned by AGENTS §8",
  },
  {
    name: "Tailwind directive",
    pattern: /@(tailwind|apply|theme)\b/,
    hint: "Tailwind is removed; use tokens and hand-written CSS",
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

console.log(
  `check:styles — ${files.length} files, no raw hex, no gradients, no Tailwind directives.`,
);
