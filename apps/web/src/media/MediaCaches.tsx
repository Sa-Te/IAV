import {
  createMediaCache,
  MediaTimeoutError,
  type MediaCache,
  type MediaCacheRuntime,
} from "@instavault/core";
import { createContext, useContext, useEffect, useMemo, type JSX, type ReactNode } from "react";

import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { browserRuntime } from "./browserRuntime.js";
import { requestThumbnail } from "./thumbnailWorker.js";

/**
 * Two caches, one per app root: originals for the detail view, thumbnails for the
 * grid (D3). Neither is a module singleton, so a test can create its own and two
 * archives can never share URLs.
 *
 * The thumbnail loader falls back to the original blob when no thumbnail can be
 * produced — a video (no poster frames until M10), an image the encoder refused,
 * or a test environment with no Worker. A tile then shows the original rather
 * than a broken box, and the cache still owns the URL.
 */

export interface MediaCaches {
  readonly original: MediaCache;
  readonly thumb: MediaCache;
}

export const MediaCachesContext = createContext<MediaCaches | null>(null);

export function createMediaCaches(
  repository: {
    getMediaBlob(path: string): Promise<Blob | null>;
    getThumbnail(path: string): Promise<{ blob: Blob } | null>;
  },
  runtime: MediaCacheRuntime<Blob> = browserRuntime,
): MediaCaches {
  const original = createMediaCache((path) => repository.getMediaBlob(path), runtime);

  // A thumbnail is an optimisation, never a dependency: when generation fails or
  // times out, the original blob answers instead. `timeout` is kept only for the
  // case where nothing answered at all, so the tile can say so.
  const thumb = createMediaCache(async (path) => {
    const stored = await repository.getThumbnail(path);
    if (stored !== null) return stored.blob;

    const generated = await requestThumbnail(path);
    if (generated.status === "blob") return generated.blob;

    const original = await repository.getMediaBlob(path);
    if (original !== null) return original;
    if (generated.status === "timeout") throw new MediaTimeoutError(`thumbnail timed out: ${path}`);
    return null;
  }, runtime);

  return { original, thumb };
}

export function MediaCachesProvider({ children }: { children: ReactNode }): JSX.Element {
  const repository = useArchiveRepository();

  const caches = useMemo(
    () =>
      createMediaCaches({
        getMediaBlob: (path) => repository.getMediaBlob(path),
        getThumbnail: (path) => repository.getThumbnail(path),
      }),
    [repository],
  );

  // Teardown at the root: every URL revoked and every bitmap closed (AGENTS §7).
  useEffect(
    () => () => {
      caches.original.releaseAll();
      caches.thumb.releaseAll();
    },
    [caches],
  );

  return <MediaCachesContext.Provider value={caches}>{children}</MediaCachesContext.Provider>;
}

/** Null outside a provider: the hook then falls back to its own fetch path. */
export function useMediaCaches(): MediaCaches | null {
  return useContext(MediaCachesContext);
}
