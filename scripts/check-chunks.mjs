#!/usr/bin/env node
/**
 * The lazy-import claim, checked against the build instead of the source.
 *
 * The cyclone route must be its own chunk and must not be reachable from the
 * entry's static imports. Reading the manifest is the only way to know that for
 * certain: a dynamic import that the bundler inlines looks identical in source.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MANIFEST = join(ROOT, "apps/web/dist/.vite/manifest.json");

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch (error) {
  console.error(`check:chunks needs a built app: ${MANIFEST}`);
  console.error(String(error));
  process.exit(1);
}

const failed = [];

const cyclone = Object.entries(manifest).filter(([key]) => /CyclonePage/i.test(key));
if (cyclone.length === 0) {
  failed.push("no cyclone chunk in the manifest (is the lazy import still lazy?)");
}

const entry = Object.entries(manifest).find(([key]) => key.endsWith("index.html"));
const staticImports = new Set(entry?.[1]?.imports ?? []);
const importedByEntry = [...staticImports].some((key) => /CyclonePage/i.test(key));
if (importedByEntry) {
  failed.push("the cyclone chunk is statically imported by the entry");
}

for (const [key, chunk] of cyclone) {
  if (/^assets\/index-.*\.js$/.test(chunk.file ?? "")) {
    failed.push(`${key} was inlined into the entry chunk`);
  }
  console.log(`cyclone chunk: ${chunk.file} (${chunk.css?.length ?? 0} css entries)`);
}

if (failed.length > 0) {
  for (const problem of failed) console.error(`check:chunks: ${problem}`);
  process.exit(1);
}

console.log("check:chunks — cyclone is its own chunk and absent from the initial load.");
