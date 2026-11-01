import { createMediaCache, toMediaItems, type MediaState } from "@instavault/core";
import { useEffect, useState, type JSX } from "react";

import { browserRuntime } from "../media/browserRuntime.js";
import { requestThumbnail } from "../media/thumbnailWorker.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";

/**
 * `/dev/media-audit` — the numbers behind "the tiles are blank".
 *
 * Reports what is actually in IndexedDB, what each of the first ten media paths
 * resolves to through the production cache, what each category *claims* to have,
 * and whether the thumbnail worker answers at all. Dev only, read-only.
 */

interface Row {
  readonly path: string;
  readonly stored: boolean;
  readonly thumb: boolean;
  readonly resolved: string;
}

interface Audit {
  readonly counts: { archive: number; categories: number; media: number; thumbs: number };
  readonly rows: readonly Row[];
  readonly categories: readonly { id: string; claimed: number }[];
  readonly worker: string;
}

export function DevMediaAudit(): JSX.Element {
  const repository = useArchiveRepository();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const counts = await repository.auditCounts();
        const page = await repository.listMedia({ limit: 10 });
        const cache = createMediaCache((path) => repository.getMediaBlob(path), browserRuntime);

        const rows: Row[] = [];
        for (const media of page.items) {
          const thumb = await repository.getThumbnail(media.path);
          const state: MediaState = await cache.getUrl(media.path);
          rows.push({
            path: media.path,
            stored: (await repository.getMediaBlob(media.path)) !== null,
            thumb: thumb !== null,
            resolved:
              state.status === "ready"
                ? `ready (${state.mime || "no mime"})`
                : state.status === "failed"
                  ? `failed:${state.reason}`
                  : "pending",
          });
        }
        cache.releaseAll();

        const records = await repository.listCategories();
        const categories = records
          .map((record) => ({
            id: record.id,
            claimed: toMediaItems(record.id, record.data).length,
          }))
          .filter((entry) => entry.claimed > 0)
          .sort((a, b) => b.claimed - a.claimed);

        const first = page.items[0]?.path;
        const worker =
          first === undefined
            ? "no media rows to ask about"
            : await Promise.race([
                requestThumbnail(first).then((blob) =>
                  blob === null
                    ? "no reply (no Worker, or generation refused)"
                    : `replied with ${blob.size} bytes`,
                ),
                new Promise<string>((resolve) =>
                  window.setTimeout(() => resolve("no reply within 3s"), 3000),
                ),
              ]);

        if (!cancelled) setAudit({ counts, rows, categories, worker });
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repository]);

  return (
    <div className="gallery">
      <h1>Media audit</h1>
      {error !== null && <p role="alert">Audit failed: {error}</p>}
      {audit === null && error === null && <p role="status">Auditing…</p>}

      {audit !== null && (
        <>
          <h2>IndexedDB</h2>
          <table>
            <caption>Rows per store</caption>
            <tbody>
              <tr>
                <th scope="row">archive</th>
                <td>{audit.counts.archive}</td>
              </tr>
              <tr>
                <th scope="row">categories</th>
                <td>{audit.counts.categories}</td>
              </tr>
              <tr>
                <th scope="row">media</th>
                <td>{audit.counts.media}</td>
              </tr>
              <tr>
                <th scope="row">thumbs</th>
                <td>{audit.counts.thumbs}</td>
              </tr>
            </tbody>
          </table>

          <h2>First 10 media paths</h2>
          <table>
            <caption>Stored, thumbnailed, and what the cache resolves to</caption>
            <thead>
              <tr>
                <th scope="col">path</th>
                <th scope="col">media row</th>
                <th scope="col">thumbs row</th>
                <th scope="col">resolved</th>
              </tr>
            </thead>
            <tbody>
              {audit.rows.map((row) => (
                <tr key={row.path}>
                  <td>{row.path}</td>
                  <td>{row.stored ? "yes" : "NO"}</td>
                  <td>{row.thumb ? "yes" : "NO"}</td>
                  <td>{row.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Categories claiming media</h2>
          <table>
            <caption>Claimed media items per category</caption>
            <tbody>
              {audit.categories.map((entry) => (
                <tr key={entry.id}>
                  <th scope="row">{entry.id}</th>
                  <td>{entry.claimed}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Thumbnail worker</h2>
          <p>{audit.worker}</p>
        </>
      )}
    </div>
  );
}
