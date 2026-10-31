#!/usr/bin/env node
/**
 * Dev tool, not a test: compare two extracted exports, or propose a registry row
 * for one file in them.
 *
 *   pnpm drift archive/ archive-2/            # writes docs/DRIFT-<today>.md
 *   pnpm drift --propose archive-2/ some_file # prints a row/schema/fixture/DATA-MAP line
 *
 * It reads directories on this machine and never touches IndexedDB. The report it
 * writes is derived structure only (see packages/core/src/drift/render.ts); the
 * `--propose` output is stdout only, so a filename never lands in a committed doc.
 *
 * NOT for CI: AGENTS.md §9 forbids tests against the real archive.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { buildArchiveShape, compareShapes } from "../packages/core/src/drift/drift.ts";
import { renderDrift } from "../packages/core/src/drift/render.ts";
import { proposeCategory } from "../packages/core/src/drift/propose.ts";
import { basenameOf, extensionOf } from "../packages/core/src/ingest/zipEntries.ts";

const args = process.argv.slice(2);

function usage(message) {
  console.error(`${message}\n`);
  console.error("usage: pnpm drift <dirA> <dirB> [--out <file>]");
  console.error("       pnpm drift --propose <dir> <basename>");
  process.exit(2);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Reads one export. A malformed JSON file is unrecognised data, not a crash. */
function readArchive(target) {
  const root = resolve(target);
  const json = [];
  const media = [];
  for (const file of walk(root)) {
    const path = relative(root, file).split("\\").join("/");
    if (extensionOf(path) === ".json") {
      let value;
      try {
        value = JSON.parse(readFileSync(file, "utf8"));
      } catch {
        value = undefined;
      }
      json.push({ path, value });
    } else {
      media.push({ path, bytes: statSync(file).size });
    }
  }
  return buildArchiveShape({ label: basenameOf(root), json, media });
}

if (args[0] === "--propose") {
  const [, target, wanted] = args;
  if (target === undefined || wanted === undefined)
    usage("--propose needs a directory and a basename");

  const root = resolve(target);
  const files = walk(root);
  const pathOf = (file) => relative(root, file).split("\\").join("/");
  const match = files.find(
    (file) =>
      extensionOf(file) === ".json" &&
      basenameOf(pathOf(file)).toLowerCase() === wanted.toLowerCase(),
  );
  if (match === undefined) usage(`no JSON file named "${wanted}" under ${target}`);

  const path = pathOf(match);
  let value;
  try {
    value = JSON.parse(readFileSync(match, "utf8"));
  } catch {
    usage(`${path} is not valid JSON — nothing to measure`);
  }

  const proposal = proposeCategory({
    path,
    value,
    mediaNames: files.filter((file) => extensionOf(file) !== ".json").map(pathOf),
  });

  if (proposal.notes.length > 0) {
    console.log(`! ${proposal.notes.join("\n! ")}\n`);
  }
  console.log(
    `## registry row — packages/core/src/registry/data/tier<${proposal.category.privacyTier}>.ts\n`,
  );
  console.log(proposal.row);
  console.log(`\n## schema — packages/core/src/schema/${proposal.id.replace(/_/g, "-")}.ts\n`);
  console.log(proposal.schema);
  console.log(`## fixture (synthetic)\n`);
  console.log(proposal.fixture);
  console.log(`\n## docs/DATA-MAP.md row\n`);
  console.log(proposal.dataMapRow);
  process.exit(0);
}

const [dirA, dirB] = args;
if (dirA === undefined || dirB === undefined) usage("two directories are required");

const outIndex = args.indexOf("--out");
const noteIndex = args.indexOf("--note");
const today = new Date().toISOString().slice(0, 10);
const out = outIndex === -1 ? `docs/DRIFT-${today}.md` : args[outIndex + 1];
const note = noteIndex === -1 ? undefined : args[noteIndex + 1];

const a = readArchive(dirA);
const b = readArchive(dirB);
const report = compareShapes(a, b);

console.log(`drift ${report.labels.a}/ vs ${report.labels.b}/`);
console.log(`  fingerprint     ${report.fingerprints.a} vs ${report.fingerprints.b}`);
console.log(`  files           ${a.files} vs ${b.files} (${a.jsonFiles} / ${b.jsonFiles} JSON)`);
console.log(`  categories      ${a.categories.length} vs ${b.categories.length}`);
console.log(`  entries         ${a.entries} vs ${b.entries}`);
console.log(`  only in ${report.labels.a}: ${report.categoriesOnlyInA.length}`);
console.log(`  only in ${report.labels.b}: ${report.categoriesOnlyInB.length}`);
console.log(`  shape changes   ${report.changed.length}`);
console.log(`  unrecognised    ${report.unrecognised.a.length} vs ${report.unrecognised.b.length}`);
console.log(
  `  media           ${report.media.filesA} vs ${report.media.filesB} files, orphans ${report.media.orphansA} vs ${report.media.orphansB}`,
);
console.log(
  `  mojibake        ${report.mojibake.stringsA} vs ${report.mojibake.stringsB} strings in ${report.mojibake.categoriesA} vs ${report.mojibake.categoriesB} categories`,
);

writeFileSync(out, renderDrift(report, today, note));
console.log(`\nwrote ${out}`);
