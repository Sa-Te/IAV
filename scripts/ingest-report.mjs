#!/usr/bin/env node
/**
 * Dev tool, not a test: measures the real ingest path against a directory.
 *
 *   pnpm ingest:report archive/
 *
 * It reads the directory on this machine, runs the same resolve + media-resolution
 * code the browser runs, and prints counts. It never touches IndexedDB, never
 * writes anything, and never prints captions, usernames, message text or media
 * filenames — only category ids, counts and the fingerprint.
 *
 * NOT for CI: AGENTS.md §9 forbids tests against the real archive, and this script
 * is excluded from `pnpm verify` for that reason.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { zipSync } from "fflate";

import { runIngest } from "../packages/core/src/ingest/ingest.ts";

const target = process.argv[2];

if (target === undefined) {
  console.error("usage: pnpm ingest:report <directory>");
  process.exit(2);
}

const root = resolve(target);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** A sink that keeps only aggregate counters: no data is retained. */
function countingSink() {
  return {
    job: null,
    batches: 0,
    categories: 0,
    ids: new Set(),
    sources: new Map(),
    media: new Set(),
    archive: null,
    async readJob() {
      return this.job;
    },
    async writeJob(job) {
      this.job = job;
    },
    async writeBatch(batch) {
      this.batches += 1;
      this.categories += batch.categories?.length ?? 0;
      for (const record of batch.categories ?? []) {
        this.ids.add(record.id);
        if ((record.sources?.length ?? 0) > 0) this.sources.set(record.id, record.sources);
      }
      for (const record of batch.media ?? []) this.media.add(record.path);
    },
    async commitArchive(row) {
      this.archive = row;
    },
    async clear() {
      this.categories = 0;
      this.media.clear();
      this.archive = null;
    },
    async estimateFreeBytes() {
      return null;
    },
    async storedCategoryIds() {
      return [];
    },
  };
}

const files = walk(root);
const entries = {};
for (const file of files) {
  entries[relative(root, file).split("\\").join("/")] = new Uint8Array(readFileSync(file));
}

// Stored (level 0) so the measurement is about parsing, not deflate speed.
const zip = zipSync(entries, { level: 0 });

const sink = countingSink();
const started = Date.now();
const job = await runIngest({ zip, sink });
const elapsed = Date.now() - started;

if (job.status !== "ready") {
  console.error(
    `ingest failed: ${job.status === "failed" ? `${job.reason} — ${job.detail}` : job.status}`,
  );
  process.exit(1);
}

const s = job.summary;
const rows = [
  ["categories", s.categories],
  ["entries", s.entries],
  ["mediaStored", s.mediaStored],
  ["mediaMissing", s.mediaMissing],
  ["mediaOrphans", s.mediaOrphans ?? "(not reported)"],
  ["unrecognised", s.unrecognised.length],
  ["fingerprint", s.fingerprint],
  ["durationMs", s.durationMs],
  ["wallMs", elapsed],
];

console.log(`ingest report for ${files.length} files\n`);
for (const [key, value] of rows) {
  console.log(`${String(key).padEnd(16)} ${String(value)}`);
}
console.log(`\nstored category ids (${sink.categories} records):`);
console.log(`  ${[...sink.ids].sort().join(", ")}`);

// A category that arrived as several files must show the split and the sum, or a
// merge defect is invisible in the one report we read after every import.
const multiFile = [...sink.sources.entries()]
  .filter(([, sources]) => sources.length > 1)
  .sort(([a], [b]) => (a < b ? -1 : 1));
if (multiFile.length > 0) {
  console.log(`\nmulti-file categories (${multiFile.length}):`);
  for (const [id, sources] of multiFile) {
    const total = sources.reduce((sum, source) => sum + source.entryCount, 0);
    // A per-file list is readable for a handful of files; 142 threads are not, so
    // the long tail keeps the count that matters (the sum) and nothing else.
    const detail =
      sources.length <= 5
        ? `${sources.map((source) => source.entryCount).join(" + ")} entries`
        : `${total} entries total`;
    console.log(`  ${id}: ${sources.length} files (${detail})`);
  }
}
