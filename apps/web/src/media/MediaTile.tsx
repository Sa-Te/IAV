import type { MediaItemView } from "@instavault/core";
import { useRef, type JSX } from "react";

import { useInViewport } from "./useInViewport.js";
import { useMediaUrl, type MediaSource } from "./useMediaUrl.js";

/**
 * One tile, three visibly distinct states. Data and the media source come in as
 * props: the tile never reaches for the repository itself.
 *
 * Grid tiles ask for the thumbnail, and only once they are near the viewport
 * (D3): a 405-tile grid must not read 405 blobs on load. The detail view asks for
 * the original.
 *
 * Poster-frame extraction for videos is M10 (D4). The cache's decoder returns
 * "ready, no bitmap" for video, the thumbnail loader falls back to the original,
 * and the tile renders a `<video preload="metadata">` frame — which is what the
 * browser gives us for free.
 */
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
  const label = item.caption.trim() === "" ? `Open ${item.category} item` : item.caption;

  return (
    <button ref={ref} type="button" className="tile" aria-label={label} onClick={onOpen}>
      <span className="tile-body">
        {media.status === "pending" && <span className="tile-pending" aria-hidden="true" />}

        {media.status === "failed" && (
          <span className="tile-failed">
            <span aria-hidden="true">!</span>
            <span>{media.reason === "missing" ? "File missing" : "Cannot display"}</span>
          </span>
        )}

        {media.status === "ready" &&
          (media.mime.startsWith("video/") ? (
            <video
              src={media.url}
              muted
              preload="metadata"
              aria-hidden="true"
              data-testid="tile-video"
            />
          ) : (
            <img
              src={media.url}
              alt={item.caption.trim() === "" ? "From your archive" : item.caption}
              loading="lazy"
            />
          ))}
      </span>
    </button>
  );
}
