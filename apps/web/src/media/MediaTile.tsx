import type { MediaItemView, MediaState } from "@instavault/core";
import { useEffect, useRef, useState, type JSX } from "react";

import { formatDuration } from "./format.js";
import { posterStoreOf, requestPoster, type PosterSource } from "./poster.js";
import { useInViewport } from "./useInViewport.js";
import { useMediaUrl, type MediaSource } from "./useMediaUrl.js";

/**
 * One tile, three visibly distinct states, and no fourth.
 *
 * The M12 bug: a tile whose URL was revoked (or whose blob was absent) rendered an
 * `<img>` that painted nothing, with no placeholder and no text. The list was
 * right, the tile was silent. Two defences now:
 *
 * 1. the status is switched on exhaustively, with a `never` check, so "neither
 *    pending nor failed nor ready" cannot compile;
 * 2. an `<img>`/`<video>` that fails to *load* a URL the cache said was ready
 *    flips the tile to the failed surface with its own reason. A ready state is a
 *    claim about the cache, not a guarantee about the browser.
 *
 * Grid tiles ask for the thumbnail, only near the viewport (D3). Poster frames for
 * video are M10's non-goal; the cache returns "ready, no bitmap" and the tile
 * shows `<video preload="metadata">`.
 */

function assertNever(value: never): never {
  throw new Error(`unhandled media state: ${JSON.stringify(value)}`);
}

function reasonText(reason: "missing" | "decode" | "timeout" | "unloadable" | "poster"): string {
  if (reason === "missing") return "Not stored";
  if (reason === "timeout") return "Timed out";
  if (reason === "poster") return "No poster";
  return "Cannot display";
}

export function MediaTile({
  item,
  source,
  onOpen,
}: {
  item: MediaItemView;
  source: MediaSource;
  onOpen: () => void;
}): JSX.Element {
  const ref = useRef<HTMLButtonElement | null>(null);
  const nearViewport = useInViewport(ref);
  const media = useMediaUrl(nearViewport ? item.id : null, source, undefined, "thumb");
  const [unloadable, setUnloadable] = useState(false);
  const [poster, setPoster] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const [duration, setDuration] = useState("");

  // A video tile asks for one still frame, once, through the existing store.
  const isVideo = media.status === "ready" && media.mime.startsWith("video/");
  useEffect(() => {
    if (!nearViewport || !isVideo) return;
    const store = posterStoreOf(source as PosterSource);
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      const blob = await source.getMediaBlob(item.id);
      if (blob === null || store === null) {
        if (!cancelled) setPosterFailed(true);
        return;
      }
      const result = await requestPoster(item.id, blob, store);
      if (cancelled) return;
      if (result === null) {
        setPosterFailed(true);
        return;
      }
      objectUrl = URL.createObjectURL(result);
      setPoster(objectUrl);
    })();

    return () => {
      cancelled = true;
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    };
  }, [nearViewport, isVideo, item.id, source]);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);

  // A new URL deserves a fresh chance, even if the previous one failed to load.
  const url = media.status === "ready" ? media.url : null;
  useEffect(() => {
    setUnloadable(false);
  }, [url]);

  // A native listener, not React's onError: a cached failure fires before React
  // attaches anything, and `complete && naturalWidth === 0` catches that case.
  // Either way the tile cannot stay silent about pixels that never arrived.
  useEffect(() => {
    const element = mediaRef.current;
    if (element === null) return;
    const onError = () => setUnloadable(true);
    element.addEventListener("error", onError);
    if (element instanceof HTMLImageElement && element.complete && element.naturalWidth === 0) {
      setUnloadable(true);
    }
    return () => element.removeEventListener("error", onError);
  }, [url]);

  const label = item.caption.trim() === "" ? `Open ${item.category} item` : item.caption;
  const failure =
    media.status === "failed"
      ? reasonText(media.reason)
      : unloadable
        ? reasonText("unloadable")
        : posterFailed
          ? reasonText("poster")
          : null;

  const body = (state: MediaState): JSX.Element => {
    switch (state.status) {
      case "pending":
        return (
          <span className="tile-pending" aria-hidden="true">
            <span className="tile-pending-bar" />
          </span>
        );

      case "failed":
        return (
          <span className="tile-failed">
            <span className="tile-failed-mark" aria-hidden="true">
              !
            </span>
            <span>{reasonText(state.reason)}</span>
          </span>
        );

      case "ready":
        if (unloadable) {
          return (
            <span className="tile-failed">
              <span className="tile-failed-mark" aria-hidden="true">
                !
              </span>
              <span>{reasonText("unloadable")}</span>
            </span>
          );
        }
        return state.mime.startsWith("video/") ? (
          <span className="tile-video-frame">
            <video
              ref={(element) => {
                mediaRef.current = element;
              }}
              src={state.url}
              poster={poster ?? undefined}
              muted
              preload="metadata"
              aria-hidden="true"
              data-testid="tile-video"
              onLoadedMetadata={(event) =>
                setDuration(formatDuration(event.currentTarget.duration))
              }
            />
            {/* A video is identifiable before its poster arrives: the glyph says
                "play", the duration says how long. */}
            <span className="tile-play" aria-hidden="true">
              ▶
            </span>
            {duration !== "" && <span className="tile-duration">{duration}</span>}
          </span>
        ) : state.mime.startsWith("audio/") ? (
          <span className="tile-audio">
            <span aria-hidden="true">♪</span> Audio
          </span>
        ) : (
          <img
            ref={(element) => {
              mediaRef.current = element;
            }}
            src={state.url}
            alt={item.caption.trim() === "" ? "From your archive" : item.caption}
            loading="lazy"
          />
        );

      default:
        return assertNever(state);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      data-media-state={media.status}
      data-media-reason={failure === null ? undefined : failure.toLowerCase()}
      className={failure === null ? "tile" : "tile tile-has-failure"}
      aria-label={failure === null ? label : `${label} — ${failure.toLowerCase()}`}
      onClick={onOpen}
    >
      <span className="tile-body">{body(media)}</span>
    </button>
  );
}
