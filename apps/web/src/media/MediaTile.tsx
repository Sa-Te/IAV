import type { MediaItemView } from "@instavault/core";
import type { JSX } from "react";

import { useMediaUrl, type MediaSource } from "./useMediaUrl.js";

/**
 * One tile, three visibly distinct states. Data and the media source come in as
 * props: the tile never reaches for the repository itself.
 *
 * Poster-frame extraction for videos is M10; until then a video tile renders a
 * `<video preload="metadata">` frame, which is what the browser gives us for free.
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
  const media = useMediaUrl(item.id, source);
  const label = item.caption.trim() === "" ? `Open ${item.category} item` : item.caption;

  return (
    <button type="button" className="tile" aria-label={label} onClick={onOpen}>
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
