import type { MediaItemView } from "@instavault/core";

/**
 * The resolved media list per filter, for the life of the page.
 *
 * Changing route used to re-read every category and show "Reading the archive…"
 * again for data the tab already had. A list is small (a category's items, or all
 * of them) and only changes when the archive does — import or wipe — so the only
 * cold load is the first visit to a filter.
 *
 * One instance per app root, created in the provider; nothing here is persisted.
 */

export interface ListEntry {
  readonly items: readonly MediaItemView[];
  readonly counts: Readonly<Record<string, number>>;
}

export interface ListCache {
  get(key: string): ListEntry | undefined;
  set(key: string, entry: ListEntry): void;
  /** Background revalidation: fetches and replaces, never touches a loading state. */
  refresh(key: string, fetch: () => Promise<ListEntry>): Promise<void>;
  clear(): void;
  subscribe(key: string, listener: (entry: ListEntry) => void): () => void;
}

export function createListCache(): ListCache {
  const entries = new Map<string, ListEntry>();
  const listeners = new Map<string, Set<(entry: ListEntry) => void>>();

  const publish = (key: string, entry: ListEntry): void => {
    entries.set(key, entry);
    for (const listener of listeners.get(key) ?? []) listener(entry);
  };

  return {
    get(key) {
      return entries.get(key);
    },

    set(key, entry) {
      publish(key, entry);
    },

    async refresh(key, fetch) {
      publish(key, await fetch());
    },

    clear() {
      entries.clear();
    },

    subscribe(key, listener) {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      return () => set.delete(listener);
    },
  };
}
