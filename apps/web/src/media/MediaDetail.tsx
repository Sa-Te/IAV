import type { MediaItemView } from "@instavault/core";
import { useEffect, useRef, type JSX } from "react";

import { useMediaUrl, type MediaSource } from "./useMediaUrl.js";
import { State } from "../ui/State.js";

/**
 * Full-size view of one item. Escape closes; the gallery restores focus to the
 * tile that opened it. Media comes from the same hook as the tile — there is no
 * second fetch path.
 */
export function MediaDetail({
  item,
  index,
  total,
  source,
  onClose,
}: {
  item: MediaItemView;
  index: number;
  total: number;
  source: MediaSource;
  onClose: () => void;
}): JSX.Element {
  const media = useMediaUrl(item.id, source);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const caption = item.caption.trim();
  const when = item.takenAt > 0 ? new Date(item.takenAt * 1000).toLocaleString() : "Date unknown";

  return (
    <div className="detail" role="dialog" aria-modal="true" aria-label="Media detail">
      <button ref={closeRef} type="button" className="detail-close" onClick={onClose}>
        Close
      </button>

      <div className="detail-media">
        {media.status === "pending" && <State kind="loading" message="Loading this item…" />}
        {media.status === "failed" && (
          <span className="tile-failed" role="alert">
            {media.reason === "missing"
              ? "File missing from the archive"
              : "File cannot be displayed"}
          </span>
        )}
        {media.status === "ready" &&
          (media.mime.startsWith("video/") ? (
            <video src={media.url} controls preload="metadata" data-testid="detail-video" />
          ) : (
            <img src={media.url} alt={caption === "" ? "From your archive" : caption} />
          ))}
      </div>

      <div className="detail-info">
        {caption === "" ? <p className="muted">No caption</p> : <p>{caption}</p>}
        <p className="muted">
          <time
            dateTime={item.takenAt > 0 ? new Date(item.takenAt * 1000).toISOString() : undefined}
          >
            {when}
          </time>
          {" · "}
          {index + 1} of {total}
          {" · "}
          <span>from {item.category}</span>
        </p>
      </div>
    </div>
  );
}
