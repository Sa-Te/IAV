/**
 * The IndexedDB schema and its single upgrader.
 *
 * Version 1 only. Future versions append a block; they never rewrite an existing
 * one, so a v2 store is an addition to this function and not a migration script
 * over user data.
 */

export const DB_NAME = "instavault";
export const DB_VERSION = 1;

export const STORE_ARCHIVE = "archive";
export const STORE_CATEGORIES = "categories";
export const STORE_MEDIA = "media";

export type StoreName = typeof STORE_ARCHIVE | typeof STORE_CATEGORIES | typeof STORE_MEDIA;

export function upgrade(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    db.createObjectStore(STORE_ARCHIVE, { keyPath: "id" });
    db.createObjectStore(STORE_CATEGORIES, { keyPath: "id" });
    db.createObjectStore(STORE_MEDIA, { keyPath: "path" });
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export interface OpenedDatabase {
  readonly db: IDBDatabase;
  readonly version: number;
}

export function openDatabase(
  factory: IDBFactory = indexedDB,
  name = DB_NAME,
): Promise<OpenedDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, DB_VERSION);
    request.onupgradeneeded = (event) => {
      upgrade(request.result, event.oldVersion);
    };
    request.onsuccess = () => resolve({ db: request.result, version: request.result.version });
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

/** Resolves when a transaction commits, rejects when it aborts. */
export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export { requestToPromise };
