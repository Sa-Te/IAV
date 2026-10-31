import type { IngestJob } from "./job.js";

/**
 * The sink the pipeline writes through. Defined in core, implemented in
 * `packages/storage`, so the dependency points inward (AGENTS.md §2) and the
 * pipeline can be tested with an in-memory fake.
 *
 * Media crosses this boundary as bytes, not `Blob`, so that core needs no DOM
 * types: the storage adapter decides how the bytes become a blob.
 */

/**
 * Structural stand-in for `AbortSignal`, so core needs no DOM types. A real
 * `AbortSignal` satisfies it.
 */
export interface CancellationSignal {
  readonly aborted: boolean;
}

/** One file that fed a category, and what it contributed. */
export interface CategorySource {
  readonly path: string;
  readonly entryCount: number;
  /** The container kind, so a reader knows how `data` was merged (§ mergePayloads). */
  readonly kind: "array" | "object" | "scalar";
}

export interface CategoryRecord {
  readonly id: string;
  readonly resolvedTier: 1 | 2;
  /** The sum across every source file, never one file's count. */
  readonly entryCount: number;
  readonly data: unknown;
  /**
   * Provenance: every file that resolved to this id, in the order read. Absent on
   * an archive imported before M8, which is why it is optional rather than a lie.
   */
  readonly sources?: readonly CategorySource[];
  readonly warnings: readonly string[];
}

export interface MediaRecord {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly mime: string;
}

export interface ArchiveCounts {
  readonly categories: number;
  readonly entries: number;
  readonly mediaStored: number;
  readonly mediaMissing: number;
  readonly mediaOrphans: number;
  readonly unrecognised: number;
}

export interface DriftReport {
  readonly previousFingerprint: string;
  readonly nextFingerprint: string;
  readonly addedCategories: readonly string[];
  readonly removedCategories: readonly string[];
}

export interface ArchiveRow {
  readonly id: "current";
  readonly fingerprint: string;
  readonly importedAt: string;
  readonly sourceBytes: number;
  readonly counts: ArchiveCounts;
  readonly drift: DriftReport | null;
  readonly job: IngestJob;
}

export interface Batch {
  readonly categories?: readonly CategoryRecord[];
  readonly media?: readonly MediaRecord[];
}

export interface IngestSink {
  /** The persisted job, or null when nothing has ever been imported. */
  readJob(): Promise<IngestJob | null>;
  writeJob(job: IngestJob): Promise<void>;
  /** One transaction per call. Callers batch; one transaction per record is a bug. */
  writeBatch(batch: Batch): Promise<void>;
  /** Final atomic write of the single archive row. */
  commitArchive(row: ArchiveRow): Promise<void>;
  /** Removes the archive row, every category and every media blob, in one transaction. */
  clear(): Promise<void>;
  /** Free bytes on the device, or null when the platform cannot say. */
  estimateFreeBytes(): Promise<number | null>;
  /** Category ids currently stored, for the pre-import drift check. */
  storedCategoryIds(): Promise<readonly string[]>;
}
