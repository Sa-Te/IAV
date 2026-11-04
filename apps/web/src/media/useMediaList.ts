import { toMediaItems, type MediaItemView } from "@instavault/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useListCache } from "../data/ListCacheContext.js";
import { createListCache, type ListCache } from "../data/listCache.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";

export type MediaListState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly items: readonly MediaItemView[] }
  | { readonly status: "error"; readonly message: string };

/**
 * Pages one category, or every category, out of the repository.
 *
 * `"all"` reads every stored category and flattens whatever each one calls media;
 * the per-category shapes are known to core (`toMediaItems`), not to the view.
 */
export function useMediaList(category: string): {
  readonly state: MediaListState;
  readonly retry: () => void;
  readonly counts: Readonly<Record<string, number>>;
} {
  const repository = useArchiveRepository();
  const provided = useListCache();
  // Outside a provider (tests, storybook-ish harnesses) the hook keeps its own
  // cache for its lifetime rather than reaching for a module singleton.
  const fallback = useRef<ListCache | null>(null);
  const cache = useMemo(() => {
    fallback.current ??= createListCache();
    return provided ?? fallback.current;
  }, [provided]);

  const hit = cache.get(category);
  const [state, setState] = useState<MediaListState>(
    hit === undefined ? { status: "loading" } : { status: "ready", items: hit.items },
  );
  const [counts, setCounts] = useState<Readonly<Record<string, number>>>(hit?.counts ?? {});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // A cache hit renders immediately — no loading state, ever — and a later
    // refresh updates in place through the subscription.
    const cached = cache.get(category);
    if (cached === undefined) setState({ status: "loading" });

    const unsubscribe = cache.subscribe(category, (entry) => {
      setState({ status: "ready", items: entry.items });
      setCounts(entry.counts);
    });

    if (cached !== undefined) {
      // A later mount inside the same page session: nothing to fetch.
      return unsubscribe;
    }

    void (async () => {
      try {
        // Always read every category: the nav needs complete counts on every
        // page, and it is one read either way.
        const records = await repository.listCategories();

        const perCategory: Record<string, number> = {};
        const items: MediaItemView[] = [];
        for (const record of records) {
          const categoryItems = toMediaItems(record.id, record.data);
          perCategory[record.id] = categoryItems.length;
          if (category === "all" || record.id === category) items.push(...categoryItems);
        }

        if (cancelled) return;

        cache.set(category, { items, counts: perCategory });
        setCounts(perCategory);
        setState({ status: "ready", items });
      } catch {
        if (!cancelled) setState({ status: "error", message: "Could not read the archive." });
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [repository, category, attempt, cache]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, retry, counts };
}
