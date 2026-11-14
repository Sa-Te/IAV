import { useEffect, useState } from "react";

import { useArchiveRepository } from "../repository/RepositoryContext.js";

/**
 * Stored size of every media path, read once per page from the media store.
 *
 * Selection needs byte totals, and the media store is the only place that knows
 * them. One thousand rows a call: the measured archive is a few hundred files, so
 * this is one request in practice, and a larger archive pages until the end.
 *
 * `null` means "not read yet". The Select control stays disabled until then, so a
 * selection can never be created against a half-known size map and print 0 MB.
 * A failed read resolves to an empty map: the gallery's own list comes from the
 * same database, and a broken read surfaces there rather than twice.
 */
export function useMediaSizes(): ReadonlyMap<string, number> | null {
  const repository = useArchiveRepository();
  const [sizes, setSizes] = useState<ReadonlyMap<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const map = new Map<string, number>();
      let cursor: string | null = null;
      try {
        do {
          const page = await repository.listMedia({ cursor, limit: 1000 });
          for (const row of page.items) map.set(row.id, row.bytes);
          cursor = page.nextCursor;
        } while (cursor !== null && !cancelled);
      } catch {
        /* Same database as the gallery: its error state already says what broke. */
      }
      if (!cancelled) setSizes(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  return sizes;
}
