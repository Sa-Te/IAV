import type { MediaState } from "@instavault/core";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

import { MediaCachesContext } from "./MediaCaches.js";

/**
 * The three-state media loader. This is the regression test for the original bug:
 * a missing blob must produce `failed`, never `pending`, and there is no `null`
 * meaning "loading" anywhere in the union.
 */

export type { MediaState };

export interface MediaSource {
  getMediaBlob(id: string): Promise<Blob | null>;
}

/**
 * One request per id, shared by every caller and kept once settled so a
 * remounting tile does not re-read a blob it already resolved.
 */
const requests = new Map<string, Promise<Blob | null>>();

export function clearMediaRequestCache(): void {
  requests.clear();
}

export function requestCount(): number {
  return requests.size;
}

function request(id: string, source: MediaSource): Promise<Blob | null> {
  const existing = requests.get(id);
  if (existing !== undefined) return existing;
  const pending = source.getMediaBlob(id).catch(() => null);
  requests.set(id, pending);
  return pending;
}

/** Bytes that cannot be decoded are a failure with a reason, not a blank tile. */
export async function defaultImageDecoder(blob: Blob): Promise<boolean> {
  if (!blob.type.startsWith("image/")) return true;
  if (typeof createImageBitmap !== "function") return true;
  try {
    const bitmap = await createImageBitmap(blob);
    if (typeof bitmap.close === "function") bitmap.close();
    return true;
  } catch {
    return false;
  }
}

export type LoadedMedia =
  | { readonly ok: true; readonly blob: Blob }
  | { readonly ok: false; readonly reason: "missing" | "decode" };

/**
 * The whole decision, without React: fetch, then decide whether the bytes are
 * usable. Pure enough to test in Node; the hook only adds URL lifecycle.
 *
 * Why the split exists (AGENTS.md §9): a `renderHook` test of the hook itself
 * aborts the Vitest worker with `SIGABRT` after ~109s under jsdom 30 and under
 * happy-dom 21 (both pools), for reasons not yet diagnosed. Until that is fixed,
 * the decisions are tested here in Node and the URL lifecycle is covered through
 * the gallery's real render. Do not "tidy" this away without a passing
 * renderHook test to replace it.
 */
export async function loadMedia(
  id: string,
  source: MediaSource,
  imageDecoder: (blob: Blob) => Promise<boolean> = defaultImageDecoder,
): Promise<LoadedMedia> {
  const blob = await request(id, source);
  if (blob === null) return { ok: false, reason: "missing" };
  const decodable = await imageDecoder(blob);
  return decodable ? { ok: true, blob } : { ok: false, reason: "decode" };
}

export function useMediaUrl(
  id: string | null,
  source: MediaSource,
  imageDecoder: (blob: Blob) => Promise<boolean> = defaultImageDecoder,
  variant: "original" | "thumb" = "original",
): MediaState {
  const caches = useContext(MediaCachesContext);
  const [state, setState] = useState<MediaState>({ status: "pending" });
  const urlRef = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (urlRef.current !== null) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Nothing asked for yet: the tile is still outside the viewport.
    if (id === null) {
      setState({ status: "pending" });
      return;
    }

    let cancelled = false;
    setState({ status: "pending" });

    const cache = caches === null ? undefined : caches[variant];
    if (cache !== undefined) {
      // The cache owns the object URL: it revokes on evict and on releaseAll, not
      // on this component's unmount, or a scroll back would re-decode.
      void cache.getUrl(id).then((next) => {
        if (!cancelled) setState(next);
      });
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const loaded = await loadMedia(id, source, imageDecoder);
      if (cancelled) return;

      if (!loaded.ok) {
        setState({ status: "failed", reason: loaded.reason });
        return;
      }

      const url = URL.createObjectURL(loaded.blob);
      urlRef.current = url;
      setState({ status: "ready", url, mime: loaded.blob.type, bitmap: null });
    })();

    return () => {
      cancelled = true;
      revoke();
    };
  }, [id, source, imageDecoder, revoke, caches, variant]);

  return state;
}
