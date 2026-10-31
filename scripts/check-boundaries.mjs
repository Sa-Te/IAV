#!/usr/bin/env node
/**
 * Boundary check for AGENTS.md §2.
 *
 * `packages/core` is pure: no React, no router, no DOM, no network, no storage,
 * nothing from `apps/`, and nothing that escapes its own package directory.
 * `packages/storage` may touch IndexedDB (it is the only module that may) but
 * still may not reach for a framework, the network, or `apps/`.
 *
 * Reads every .ts/.tsx under the two packages, reports `file:line`, exits 1 on
 * any violation.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const PACKAGES = [
  {
    name: "core",
    dir: join(ROOT, "packages/core/src"),
    // The boundary is the *package*, not its src folder: test fakes live in
    // packages/core/test and are part of the package.
    rootDir: join(ROOT, "packages/core"),
    // core may not touch the DOM at all, including these globals
    domGlobals: ["indexedDB", "fetch", "XMLHttpRequest", "localStorage"],
  },
  {
    name: "storage",
    dir: join(ROOT, "packages/storage/src"),
    rootDir: join(ROOT, "packages/storage"),
    // storage is allowed IndexedDB and localStorage; it is not allowed the network
    domGlobals: ["fetch", "XMLHttpRequest"],
  },
];

const FORBIDDEN_MODULES = new Set([
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-router",
  "react-router-dom",
]);

/** Imports core must never make, by package name. */
const CORE_FORBIDDEN_IMPORTS = new Set([
  "@instavault/storage",
  "@instavault/worker",
  "@instavault/web",
]);

const violations = [];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

const IMPORT_PATTERNS = [
  /(?:^|[^.\w])(?:import|export)\s+(?:[^;'"()]*?\s+from\s+)?["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

for (const pkg of PACKAGES) {
  const files = walk(pkg.dir);
  if (files.length === 0) {
    console.error(`boundaries: no source files found under ${relative(ROOT, pkg.dir)}`);
    process.exitCode = 1;
    continue;
  }

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const rel = relative(ROOT, file);
    const stripped = stripComments(source);

    for (const pattern of IMPORT_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source)) !== null) {
        const specifier = match[1];
        if (specifier === undefined) continue;
        // The pattern consumes one character before `import`, which is usually a
        // newline. Report the line the specifier itself sits on, not the pattern start.
        const line = lineOf(source, match.index + match[0].lastIndexOf(specifier));
        const report = (reason) => violations.push({ rel, line, specifier, reason });

        if (FORBIDDEN_MODULES.has(specifier) || specifier.startsWith("react-dom/")) {
          report("framework import is banned in packages/");
          continue;
        }
        if (pkg.name === "core" && CORE_FORBIDDEN_IMPORTS.has(specifier)) {
          report("core may not import another workspace package");
          continue;
        }
        if (specifier.startsWith("@instavault/") && pkg.name === "core") {
          report("core may not import another workspace package");
          continue;
        }
        if (/(^|\/)apps\//.test(specifier) || specifier.includes("/apps/")) {
          report("import reaches into apps/");
          continue;
        }
        if (specifier.startsWith(".") || specifier.startsWith("/")) {
          const target = resolve(file, "..", specifier);
          if (!target.startsWith(pkg.rootDir + sep) && target !== pkg.rootDir) {
            report("relative import escapes the package");
          }
          continue;
        }
        if (pkg.domGlobals.includes(specifier.split("/")[0] ?? "")) {
          report("DOM/storage module imported directly");
        }
      }
    }

    for (const global of pkg.domGlobals) {
      const usage = new RegExp(`(^|[^.\\w])${global}\\s*[.(\\[]`, "g");
      usage.lastIndex = 0;
      let match;
      while ((match = usage.exec(stripped)) !== null) {
        violations.push({
          rel,
          line: lineOf(stripped, match.index),
          specifier: global,
          reason: `uses the \`${global}\` global (DOM/network access)`,
        });
      }
    }
  }
}

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`${v.rel}:${v.line}: ${v.specifier} — ${v.reason}`);
  }
  console.error(`\nboundaries: ${violations.length} violation(s)`);
  process.exit(1);
}

console.log("boundaries: ok — packages/core and packages/storage are inside the cage");
