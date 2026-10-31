import type {
  ArchiveRow,
  IngestJob,
  IngestSink,
  Batch,
  CategoryRecord,
  MediaRecord,
} from "@instavault/core";

import {
  openDatabase,
  requestToPromise,
  STORE_ARCHIVE,
  STORE_CATEGORIES,
  STORE_MEDIA,
  transactionDone,
} from "./db.js";

/** A stored media blob. `id` is the archive-relative path, which is unique. */
export interface MediaRow {
  readonly id: string;
  readonly path: string;
  readonly bytes: number;
  readonly mime: string;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export interface MediaFilter {
  readonly cursor?: string | null;
  readonly limit?: number;
}

/**
 * The data-access seam (AGENTS.md §2). Concrete shapes rather than the sketch's
 * generic `CategoryData[K]`: there is no category type map yet, and inventing one
 * before the parsers exist would be scaffolding (AGENTS.md §4).
 */
export interface ArchiveRepository {
  listMedia(filter: MediaFilter): Promise<Page<MediaRow>>;
  getMediaBlob(id: string): Promise<Blob | null>;
  getCategory(id: string): Promise<CategoryRecord | null>;
  summary(): Promise<ArchiveRow | null>;
}

interface StoredMedia {
  readonly path: string;
  readonly blob: Blob;
  readonly bytes: number;
  readonly mime: string;
}

const DEFAULT_PAGE = 50;

/**
 * The only implementation of the storage port, and the only module in the repo
 * allowed to touch `indexedDB` (AGENTS.md §2).
 */
export class LocalArchiveRepository implements IngestSink, ArchiveRepository {
  constructor(private readonly db: IDBDatabase) {}

  /** The schema version actually open, for tests and diagnostics. */
  get schemaVersion(): number {
    return this.db.version;
  }

  async readJob(): Promise<IngestJob | null> {
    const row = (await requestToPromise(
      this.db.transaction(STORE_ARCHIVE, "readonly").objectStore(STORE_ARCHIVE).get("current"),
    )) as ArchiveRow | undefined;
    return row === undefined ? null : row.job;
  }

  async writeJob(job: IngestJob): Promise<void> {
    const tx = this.db.transaction(STORE_ARCHIVE, "readwrite");
    const store = tx.objectStore(STORE_ARCHIVE);
    const existing = (await requestToPromise(store.get("current"))) as ArchiveRow | undefined;
    store.put(existing === undefined ? { id: "current", job } : { ...existing, job });
    await transactionDone(tx);
  }

  /** One transaction for the whole batch — never one per record (AGENTS.md §7). */
  async writeBatch(batch: Batch): Promise<void> {
    const categories = batch.categories ?? [];
    const media = batch.media ?? [];
    if (categories.length === 0 && media.length === 0) return;

    const stores: string[] = [];
    if (categories.length > 0) stores.push(STORE_CATEGORIES);
    if (media.length > 0) stores.push(STORE_MEDIA);

    const tx = this.db.transaction(stores, "readwrite");
    for (const record of categories) {
      tx.objectStore(STORE_CATEGORIES).put(record);
    }
    for (const record of media) {
      tx.objectStore(STORE_MEDIA).put(toStoredMedia(record));
    }
    await transactionDone(tx);
  }

  async commitArchive(row: ArchiveRow): Promise<void> {
    const tx = this.db.transaction(STORE_ARCHIVE, "readwrite");
    tx.objectStore(STORE_ARCHIVE).put(row);
    await transactionDone(tx);
  }

  /** Archive, categories and media together: no half-deleted archive. */
  async clear(): Promise<void> {
    const tx = this.db.transaction([STORE_ARCHIVE, STORE_CATEGORIES, STORE_MEDIA], "readwrite");
    tx.objectStore(STORE_ARCHIVE).clear();
    tx.objectStore(STORE_CATEGORIES).clear();
    tx.objectStore(STORE_MEDIA).clear();
    await transactionDone(tx);
  }

  async estimateFreeBytes(): Promise<number | null> {
    const storage = globalThis.navigator?.storage;
    if (storage === undefined || typeof storage.estimate !== "function") return null;
    try {
      const { quota, usage } = await storage.estimate();
      if (quota === undefined || usage === undefined) return null;
      return Math.max(0, quota - usage);
    } catch {
      return null;
    }
  }

  async storedCategoryIds(): Promise<readonly string[]> {
    const keys = (await requestToPromise(
      this.db.transaction(STORE_CATEGORIES, "readonly").objectStore(STORE_CATEGORIES).getAllKeys(),
    )) as IDBValidKey[];
    return keys.map(String);
  }

  // --- ArchiveRepository ---------------------------------------------------

  async listMedia(filter: MediaFilter = {}): Promise<Page<MediaRow>> {
    const limit = filter.limit ?? DEFAULT_PAGE;
    const cursor = filter.cursor ?? null;
    const tx = this.db.transaction(STORE_MEDIA, "readonly");
    const range = cursor === null ? undefined : IDBKeyRange.lowerBound(cursor, true);
    const rows = (await requestToPromise(
      tx.objectStore(STORE_MEDIA).getAll(range, limit),
    )) as StoredMedia[];
    const last = rows[rows.length - 1];
    return {
      items: rows.map((row) => ({
        id: row.path,
        path: row.path,
        bytes: row.bytes,
        mime: row.mime,
      })),
      nextCursor: rows.length === limit && last !== undefined ? last.path : null,
    };
  }

  async getMediaBlob(id: string): Promise<Blob | null> {
    const row = (await requestToPromise(
      this.db.transaction(STORE_MEDIA, "readonly").objectStore(STORE_MEDIA).get(id),
    )) as StoredMedia | undefined;
    return row?.blob ?? null;
  }

  async getCategory(id: string): Promise<CategoryRecord | null> {
    const row = (await requestToPromise(
      this.db.transaction(STORE_CATEGORIES, "readonly").objectStore(STORE_CATEGORIES).get(id),
    )) as CategoryRecord | undefined;
    return row ?? null;
  }

  async summary(): Promise<ArchiveRow | null> {
    const row = (await requestToPromise(
      this.db.transaction(STORE_ARCHIVE, "readonly").objectStore(STORE_ARCHIVE).get("current"),
    )) as Partial<ArchiveRow> | undefined;
    // A row carrying only a job is a placeholder written mid-import, not an
    // archive: reporting it as one would claim a fingerprint we never computed.
    return row === undefined || typeof row.fingerprint !== "string" ? null : (row as ArchiveRow);
  }
}

function toStoredMedia(record: MediaRecord): StoredMedia {
  // Copy into an ArrayBuffer-backed view: the incoming Uint8Array may be a view
  // over a SharedArrayBuffer, which BlobPart does not accept.
  const copy = new Uint8Array(record.bytes.byteLength);
  copy.set(record.bytes);
  return {
    path: record.path,
    blob: new Blob([copy], { type: record.mime }),
    bytes: copy.byteLength,
    mime: record.mime,
  };
}

/** Convenience factory: open (or create) the database and wrap it. */
export async function createLocalArchiveRepository(factory?: IDBFactory) {
  const { db } = await openDatabase(factory);
  return new LocalArchiveRepository(db);
}
