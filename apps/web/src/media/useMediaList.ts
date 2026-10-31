import { toMediaItems, type MediaItemView } from "@instavault/core";
import { useCallback, useEffect, useState } from "react";

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
  const [state, setState] = useState<MediaListState>({ status: "loading" });
  const [counts, setCounts] = useState<Readonly<Record<string, number>>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

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
        setCounts(perCategory);
        setState({ status: "ready", items });
      } catch {
        if (!cancelled) setState({ status: "error", message: "Could not read the archive." });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repository, category, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, retry, counts };
}
