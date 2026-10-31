import { Unzip, UnzipInflate, unzipSync } from "fflate";

import { findCategory } from "../registry/categories.js";
import { computeFingerprint, type ResolvedCategory } from "../registry/fingerprint.js";
import { resolveCategory } from "../registry/resolve.js";
import { normaliseStrings } from "../strings/normaliseStrings.js";
import {
  failed,
  parsing,
  ready,
  type IngestJob,
  type IngestSummary,
  type UnrecognisedShape,
} from "./job.js";
import {
  collectUris,
  computeDrift,
  entryCountOf,
  firstEntryKeys,
  mergeValues,
  unrecognisedShape,
} from "./payload.js";
import {
  basenameOf,
  concat,
  dirnameOf,
  extensionOf,
  isMediaEntry,
  isZip,
  listNames,
} from "./zipEntries.js";
import { detectMime } from "./mime.js";
import type {
  ArchiveRow,
  CancellationSignal,
  CategoryRecord,
  IngestSink,
  MediaRecord,
} from "./port.js";

/** AGENTS.md §7: one transaction per batch, never per record. */
export const BATCH_SIZE = 50;
/** Input is pushed to the unzipper in slices so batches can flush between them. */
export const CHUNK_BYTES = 4 * 1024 * 1024;
export const PROGRESS_INTERVAL_MS = 2000;
/** ADR 0006: the archive, plus the room the browser needs to write it. */
export const SPACE_FACTOR = 2.5;

export interface RunIngestOptions {
  readonly zip: Uint8Array;
  readonly sink: IngestSink;
  readonly signal?: CancellationSignal;
  readonly onProgress?: (job: IngestJob) => void;
  readonly now?: () => number;
}

/**
 * One import: validate, resolve, normalise, store.
 *
 * Always returns a terminal job (`ready` or `failed`). Progress is reported and
 * persisted while it runs, so a closed tab leaves a `parsing` record that the
 * caller recovers as `interrupted` rather than a spinner that never ends.
 */
export async function runIngest(options: RunIngestOptions): Promise<IngestJob> {
  const { zip, sink, signal, onProgress } = options;
  const now = options.now ?? (() => Date.now());
  const startedAt = now();
  let lastEmit = -PROGRESS_INTERVAL_MS;

  const publish = async (job: IngestJob, force = false): Promise<void> => {
    const at = now();
    if (!force && at - lastEmit < PROGRESS_INTERVAL_MS) return;
    lastEmit = at;
    await sink.writeJob(job);
    onProgress?.(job);
  };

  const finish = async (job: IngestJob): Promise<IngestJob> => {
    await sink.writeJob(job);
    onProgress?.(job);
    return job;
  };

  const aborted = (): IngestJob | null =>
    signal?.aborted === true
      ? failed("cancelled", "The import was cancelled before it finished.")
      : null;

  // --- validation: nothing is written until this passes ---------------------
  if (!isZip(zip)) {
    return finish(failed("not-a-zip", "The file does not start with a ZIP signature."));
  }

  let names: readonly string[];
  try {
    names = listNames(zip);
  } catch (error) {
    return finish(failed("corrupt-entry", `The ZIP directory could not be read: ${String(error)}`));
  }

  const jsonNames = names.filter((name) => extensionOf(name) === ".json");
  const htmlNames = names.filter((name) => extensionOf(name) === ".html");

  if (jsonNames.length === 0 && htmlNames.length > 0) {
    return finish(
      failed(
        "html-export",
        `This archive contains ${htmlNames.length} HTML files and no JSON files. Re-request your information from Instagram and choose JSON instead of HTML.`,
      ),
    );
  }
  if (jsonNames.length === 0) {
    return finish(failed("not-a-zip", "The ZIP archive contains no JSON files."));
  }

  const required = Math.ceil(zip.length * SPACE_FACTOR);
  const free = await sink.estimateFreeBytes();
  if (free !== null && free < required) {
    return finish(
      failed(
        "insufficient-space",
        `This archive needs about ${required.toLocaleString("en-US")} bytes of free space; this device has ${free.toLocaleString("en-US")} bytes free.`,
      ),
    );
  }

  // --- replacement is now safe to perform -----------------------------------
  const previousIds = await sink.storedCategoryIds();
  const previousJob = await sink.readJob();
  const previousFingerprint =
    previousJob !== null && previousJob.status === "ready" ? previousJob.summary.fingerprint : null;
  await sink.clear();

  // --- read: stream JSON entries, collect references ------------------------
  // Media is NOT stored while scanning: a file is stored because something
  // references it, not because its name looks like media.
  const entryNames = new Set(names);
  const rawById = new Map<string, { tier: 1 | 2; value: unknown }>();
  const unrecognised: UnrecognisedShape[] = [];
  const references: { uri: string; dir: string; threadFirst: boolean }[] = [];

  const handleJson = (name: string, bytes: Uint8Array): void => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    } catch {
      // Malformed JSON is data we could not read: unrecognised, not a failure.
      unrecognised.push({ basename: basenameOf(name), kind: "scalar", keys: [], entryCount: 0 });
      return;
    }

    const resolved = resolveCategory({ path: name, sample: parsed });
    if (!resolved.ok) {
      unrecognised.push(unrecognisedShape(name, parsed));
      return;
    }

    const existing = rawById.get(resolved.id);
    rawById.set(resolved.id, {
      tier: resolved.tier,
      value: existing === undefined ? parsed : mergeValues(existing.value, parsed),
    });

    const mediaPath = findCategory(resolved.id)?.mediaPath ?? "none";
    if (mediaPath === "none") return;
    const dir = dirnameOf(name);
    for (const uri of collectUris(parsed)) {
      references.push({ uri, dir, threadFirst: mediaPath === "thread-relative" });
    }
  };

  const unzipper = new Unzip((file) => {
    const chunks: Uint8Array[] = [];
    file.ondata = (error, chunk, final) => {
      if (error !== null) throw error;
      chunks.push(chunk);
      if (!final) return;
      const bytes = concat(chunks);
      if (extensionOf(file.name) === ".json") {
        handleJson(file.name, bytes);
      }
    };
    file.start();
  });
  // The streaming reader has no built-in decoders: without this, every deflated
  // entry fails with "unknown compression type 8".
  unzipper.register(UnzipInflate);

  for (let offset = 0; offset < zip.length; offset += CHUNK_BYTES) {
    const stop = aborted();
    if (stop !== null) {
      await sink.clear();
      return finish(stop);
    }

    const end = Math.min(offset + CHUNK_BYTES, zip.length);
    try {
      unzipper.push(zip.subarray(offset, end), end >= zip.length);
    } catch (error) {
      await sink.clear();
      return finish(
        failed("corrupt-entry", `An archive entry could not be read: ${String(error)}`),
      );
    }

    await publish(parsing("reading", end, zip.length));
  }
  const stopAfterRead = aborted();
  if (stopAfterRead !== null) {
    await sink.clear();
    return finish(stopAfterRead);
  }

  await publish(parsing("resolving", jsonNames.length, jsonNames.length), true);

  // --- resolve references, then store exactly what resolved -----------------
  // Preferred base first (the registry's declared mediaPath), the other second:
  // exports differ, and a wrong guess must degrade to a miss, never a crash.
  let mediaMissing = 0;
  const resolvedPaths = new Set<string>();
  for (const reference of references) {
    const threadCandidate = `${reference.dir}/${reference.uri}`;
    const candidates = reference.threadFirst
      ? [threadCandidate, reference.uri]
      : [reference.uri, threadCandidate];
    const hit = candidates.find((candidate) => entryNames.has(candidate));
    if (hit === undefined) {
      mediaMissing += 1;
      continue;
    }
    resolvedPaths.add(hit);
  }

  const mediaOrphans = names.filter(
    (name) => isMediaEntry(name) && !resolvedPaths.has(name),
  ).length;

  await publish(parsing("storing", 0, Math.max(resolvedPaths.size, 1)), true);

  let mediaStored = 0;
  if (resolvedPaths.size > 0) {
    // Second pass over the archive, decompressing only the entries a reference
    // resolved to. The first pass needed names only.
    const wanted = unzipSync(zip, { filter: (file) => resolvedPaths.has(file.name) });
    let batch: MediaRecord[] = [];
    for (const [path, bytes] of Object.entries(wanted) as [string, Uint8Array][]) {
      const stop = aborted();
      if (stop !== null) {
        await sink.clear();
        return finish(stop);
      }
      batch.push({ path, bytes, mime: detectMime(bytes, path) });
      mediaStored += 1;
      if (batch.length >= BATCH_SIZE) {
        await sink.writeBatch({ media: batch });
        await publish(parsing("storing", mediaStored, Math.max(resolvedPaths.size, 1)));
        batch = [];
      }
    }
    if (batch.length > 0) await sink.writeBatch({ media: batch });
  }

  // --- normalise ------------------------------------------------------------
  const categories: CategoryRecord[] = [...rawById.entries()].map(([id, entry]) => ({
    id,
    resolvedTier: entry.tier,
    entryCount: entryCountOf(entry.value),
    data: normaliseStrings(entry.value),
    warnings: [],
  }));

  const resolvedForFingerprint: ResolvedCategory[] = categories
    .map((record) => ({ id: record.id, keys: firstEntryKeys(record.data) }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  // --- store ----------------------------------------------------------------
  for (let index = 0; index < categories.length; index += BATCH_SIZE) {
    const stop = aborted();
    if (stop !== null) {
      await sink.clear();
      return finish(stop);
    }
    const batch = categories.slice(index, index + BATCH_SIZE);
    await sink.writeBatch({ categories: batch });
    await publish(
      parsing("storing", Math.min(index + batch.length, categories.length), categories.length),
    );
  }

  const entries = categories.reduce((sum, record) => sum + record.entryCount, 0);
  const summary: IngestSummary = {
    categories: categories.length,
    entries,
    mediaStored,
    mediaMissing,
    mediaOrphans,
    unrecognised,
    fingerprint: computeFingerprint(resolvedForFingerprint),
    durationMs: Math.max(0, now() - startedAt),
  };

  const row: ArchiveRow = {
    id: "current",
    fingerprint: summary.fingerprint,
    importedAt: new Date(now()).toISOString(),
    sourceBytes: zip.length,
    counts: {
      categories: summary.categories,
      entries: summary.entries,
      mediaStored: summary.mediaStored,
      mediaMissing: summary.mediaMissing,
      mediaOrphans: summary.mediaOrphans,
      unrecognised: summary.unrecognised.length,
    },
    drift: computeDrift(
      previousFingerprint,
      summary.fingerprint,
      previousIds,
      categories.map((record) => record.id),
    ),
    job: ready(summary),
  };
  await sink.commitArchive(row);

  return finish(ready(summary));
}
