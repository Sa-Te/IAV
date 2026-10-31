import { Unzip, UnzipInflate } from "fflate";

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
  mimeFor,
} from "./zipEntries.js";
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

  // --- read: stream entries, keep one entry at a time -----------------------
  const mediaPaths = new Set(names);
  const rawById = new Map<string, { tier: 1 | 2; value: unknown }>();
  const unrecognised: UnrecognisedShape[] = [];
  let mediaQueued: MediaRecord[] = [];
  let mediaStored = 0;
  let mediaMissing = 0;

  const flushMedia = async (): Promise<void> => {
    if (mediaQueued.length === 0) return;
    const batch = mediaQueued;
    mediaQueued = [];
    await sink.writeBatch({ media: batch });
  };

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
    const base = mediaPath === "thread-relative" ? dirnameOf(name) : "";
    for (const uri of collectUris(parsed)) {
      const absolute = base === "" ? uri : `${base}/${uri}`;
      if (!mediaPaths.has(absolute)) mediaMissing += 1;
    }
  };

  const unzipper = new Unzip((file) => {
    const chunks: Uint8Array[] = [];
    file.ondata = (error, chunk, final) => {
      if (error !== null) throw error;
      chunks.push(chunk);
      if (!final) return;
      const bytes = concat(chunks);
      const extension = extensionOf(file.name);
      if (extension === ".json") {
        handleJson(file.name, bytes);
      } else if (isMediaEntry(file.name)) {
        mediaQueued.push({ path: file.name, bytes, mime: mimeFor(file.name) });
        mediaStored += 1;
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

    if (mediaQueued.length >= BATCH_SIZE) await flushMedia();
    await publish(parsing("reading", end, zip.length));
  }
  await flushMedia();

  const stopAfterRead = aborted();
  if (stopAfterRead !== null) {
    await sink.clear();
    return finish(stopAfterRead);
  }

  await publish(parsing("resolving", jsonNames.length, jsonNames.length), true);

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
