import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The three-state media loader. This is the regression test for the original bug:
 * a missing blob must produce `failed`, never `pending`, and there is no `null`
 * meaning "loading" anywhere in the union.
 */

export type MediaState =
  | { readonly status: "pending" }
  | { readonly status: "ready"; readonly url: string; readonly mime: string }
  | { readonly status: "failed"; readonly reason: "missing" | "decode" };

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
): MediaState {
  const [state, setState] = useState<MediaState>({ status: "pending" });
  const urlRef = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (urlRef.current !== null) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (id === null) {
      setState({ status: "failed", reason: "missing" });
      return;
    }

    let cancelled = false;
    setState({ status: "pending" });

    void (async () => {
      const loaded = await loadMedia(id, source, imageDecoder);
      if (cancelled) return;

      if (!loaded.ok) {
        setState({ status: "failed", reason: loaded.reason });
        return;
      }

      const url = URL.createObjectURL(loaded.blob);
      urlRef.current = url;
      setState({ status: "ready", url, mime: loaded.blob.type });
    })();

    return () => {
      cancelled = true;
      revoke();
    };
  }, [id, source, imageDecoder, revoke]);

  return state;
}
