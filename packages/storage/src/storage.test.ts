import "fake-indexeddb/auto";

import type { ArchiveRow, CategoryRecord, IngestJob } from "@instavault/core";
import { describe, expect, it } from "vitest";

import { DB_VERSION, openDatabase } from "./db.js";
import { LocalArchiveRepository } from "./localArchiveRepository.js";

let sequence = 0;
async function freshRepository(): Promise<LocalArchiveRepository> {
  sequence += 1;
  const { db } = await openDatabase(indexedDB, `instavault-test-${sequence}`);
  return new LocalArchiveRepository(db);
}

/** Counts transactions without the production code knowing it is being watched. */
function countingDatabase(db: IDBDatabase, onTransaction: () => void): IDBDatabase {
  return new Proxy(db, {
    get(target, property, receiver) {
      if (property === "transaction") {
        return (stores: string | string[], mode?: IDBTransactionMode) => {
          onTransaction();
          return target.transaction(stores, mode);
        };
      }
      const value = Reflect.get(target, property, receiver) as unknown;
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(target)
        : value;
    },
  }) as IDBDatabase;
}

const CATEGORY: CategoryRecord = {
  id: "posts",
  resolvedTier: 1,
  entryCount: 2,
  data: [{ media: [{ uri: "media/posts/a.jpg" }] }],
  warnings: [],
};

const JOB: IngestJob = {
  status: "ready",
  summary: {
    categories: 1,
    entries: 2,
    mediaStored: 1,
    mediaMissing: 0,
    mediaOrphans: 0,
    unrecognised: [],
    fingerprint: "fmt-abc123",
    durationMs: 5,
  },
};

describe("LocalArchiveRepository", () => {
  it("round-trips a category and a media blob", async () => {
    const repository = await freshRepository();

    await repository.writeBatch({ categories: [CATEGORY] });
    await repository.writeBatch({
      media: [
        { path: "media/posts/a.jpg", bytes: new Uint8Array([1, 2, 3, 4]), mime: "image/jpeg" },
      ],
    });

    const category = await repository.getCategory("posts");
    expect(category?.entryCount).toBe(2);

    const blob = await repository.getMediaBlob("media/posts/a.jpg");
    expect(blob?.size).toBe(4);
    expect(blob?.type).toBe("image/jpeg");
  });

  it("uses one transaction per batch, not one per record", async () => {
    const { db } = await openDatabase(indexedDB, `instavault-tx-${Date.now()}`);
    let transactions = 0;
    const repository = new LocalArchiveRepository(countingDatabase(db, () => (transactions += 1)));

    const batch = (offset: number): CategoryRecord[] =>
      Array.from({ length: 50 }, (_unused, index) => ({
        ...CATEGORY,
        id: `cat-${offset + index}`,
      }));

    await repository.writeBatch({ categories: batch(0) });
    await repository.writeBatch({ categories: batch(50) });
    await repository.writeBatch({ categories: batch(100) });

    expect(transactions).toBe(3);
  });

  it("writes a mixed batch in a single transaction too", async () => {
    const { db } = await openDatabase(indexedDB, `instavault-mixed-${Date.now()}`);
    let transactions = 0;
    const repository = new LocalArchiveRepository(countingDatabase(db, () => (transactions += 1)));

    await repository.writeBatch({
      categories: [CATEGORY],
      media: [{ path: "media/posts/a.jpg", bytes: new Uint8Array([9]), mime: "image/jpeg" }],
    });

    expect(transactions).toBe(1);
  });

  it("empties everything in clear()", async () => {
    const repository = await freshRepository();
    await repository.writeBatch({ categories: [CATEGORY] });
    await repository.writeBatch({
      media: [{ path: "media/posts/a.jpg", bytes: new Uint8Array([1]), mime: "image/jpeg" }],
    });

    await repository.clear();

    expect(await repository.getCategory("posts")).toBeNull();
    expect(await repository.getMediaBlob("media/posts/a.jpg")).toBeNull();
    expect(await repository.summary()).toBeNull();
    expect(await repository.readJob()).toBeNull();
  });

  it("exposes the schema version", async () => {
    const repository = await freshRepository();
    expect(repository.schemaVersion).toBe(DB_VERSION);
  });

  it("persists a job before an archive row exists", async () => {
    const repository = await freshRepository();
    await repository.writeJob({ status: "parsing", phase: "reading", done: 1, total: 4 });
    expect(await repository.readJob()).toEqual({
      status: "parsing",
      phase: "reading",
      done: 1,
      total: 4,
    });
    expect(await repository.summary()).toBeNull();
  });

  it("commits the archive row and reads it back", async () => {
    const repository = await freshRepository();
    const row: ArchiveRow = {
      id: "current",
      fingerprint: "fmt-abc123",
      importedAt: "2026-10-31T00:00:00.000Z",
      sourceBytes: 1234,
      counts: {
        categories: 1,
        entries: 2,
        mediaStored: 1,
        mediaMissing: 0,
        mediaOrphans: 0,
        unrecognised: 0,
      },
      drift: null,
      job: JOB,
    };
    await repository.commitArchive(row);

    const stored = await repository.summary();
    expect(stored?.fingerprint).toBe("fmt-abc123");
    expect(stored?.counts.entries).toBe(2);
    expect(await repository.readJob()).toEqual(JOB);
  });

  it("reports free space from navigator.storage.estimate", async () => {
    const repository = await freshRepository();
    const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { storage: { estimate: async () => ({ quota: 1000, usage: 200 }) } },
    });
    try {
      expect(await repository.estimateFreeBytes()).toBe(800);
    } finally {
      if (original === undefined) {
        delete (globalThis as { navigator?: unknown }).navigator;
      } else {
        Object.defineProperty(globalThis, "navigator", original);
      }
    }
  });

  it("returns null when the platform cannot estimate", async () => {
    const repository = await freshRepository();
    expect(await repository.estimateFreeBytes()).toBeNull();
  });
});

describe("schema v2 — thumbnails", () => {
  it("upgrades a v1 database without losing archive, categories or media", async () => {
    const name = `instavault-migrate-${Date.now()}`;

    // A real v1 database: only the three v1 stores exist.
    const v1 = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("archive", { keyPath: "id" });
        db.createObjectStore("categories", { keyPath: "id" });
        db.createObjectStore("media", { keyPath: "path" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const tx = v1.transaction(["archive", "categories", "media"], "readwrite");
      tx.objectStore("archive").put({
        id: "current",
        fingerprint: "fmt-v1",
        job: { status: "idle" },
      });
      tx.objectStore("categories").put(CATEGORY);
      tx.objectStore("media").put({
        path: "media/posts/a.jpg",
        blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/jpeg" }),
        bytes: 4,
        mime: "image/jpeg",
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    v1.close();

    const { db, version } = await openDatabase(indexedDB, name);
    expect(version).toBe(DB_VERSION);
    expect(DB_VERSION).toBe(2);

    const repository = new LocalArchiveRepository(db);
    expect((await repository.getCategory("posts"))?.entryCount).toBe(2);
    expect((await repository.getMediaBlob("media/posts/a.jpg"))?.size).toBe(4);
    expect((await repository.summary())?.fingerprint).toBe("fmt-v1");

    // The new store exists and round-trips.
    await repository.putThumbnail({
      path: "media/posts/a.jpg",
      blob: new Blob([new Uint8Array([9])], { type: "image/webp" }),
      type: "image/webp",
      width: 512,
      height: 384,
      sourceBytes: 4,
    });
    const thumb = await repository.getThumbnail("media/posts/a.jpg");
    expect(thumb?.width).toBe(512);
    expect(thumb?.type).toBe("image/webp");
  });

  it("removes thumbnails when the archive is cleared", async () => {
    const repository = await freshRepository();
    await repository.putThumbnail({
      path: "media/posts/a.jpg",
      blob: new Blob([new Uint8Array([1])], { type: "image/webp" }),
      type: "image/webp",
      width: 1,
      height: 1,
      sourceBytes: 4,
    });

    await repository.clear();

    expect(await repository.getThumbnail("media/posts/a.jpg")).toBeNull();
  });
});
