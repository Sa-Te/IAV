import type { PostEntry } from "@instavault/core";
import { useEffect, useRef, type JSX } from "react";

import { useMediaUrl } from "../media/useMediaUrl.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";

/**
 * Full-size view of one post. Escape closes; focus returns to the opening tile
 * (handled by the gallery, which remembers it). Media comes from the same
 * `useMediaUrl` hook as the tile — there is no second fetch path.
 */
export function DetailView({
  post,
  index,
  total,
  onClose,
}: {
  post: PostEntry;
  index: number;
  total: number;
  onClose: () => void;
}): JSX.Element {
  const repository = useArchiveRepository();
  const media = useMediaUrl(post.id, repository);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const caption = post.caption.trim();
  const when = post.takenAt > 0 ? new Date(post.takenAt * 1000).toLocaleString() : "Date unknown";

  return (
    <div className="detail" role="dialog" aria-modal="true" aria-label="Post detail">
      <button ref={closeRef} type="button" className="detail-close" onClick={onClose}>
        Close
      </button>

      <div className="detail-media">
        {media.status === "pending" && (
          <span className="tile-body tile-pending" role="status">
            Loading…
          </span>
        )}
        {media.status === "failed" && (
          <span className="tile-body tile-failed" role="alert">
            {media.reason === "missing"
              ? "File missing from the archive"
              : "File cannot be displayed"}
          </span>
        )}
        {media.status === "ready" &&
          (media.mime.startsWith("video/") ? (
            <video src={media.url} controls preload="metadata" />
          ) : (
            <img src={media.url} alt={caption === "" ? "Post from your archive" : caption} />
          ))}
      </div>

      <div className="detail-info">
        {caption === "" ? <p className="muted">No caption</p> : <p>{caption}</p>}
        <p className="muted">
          <time
            dateTime={post.takenAt > 0 ? new Date(post.takenAt * 1000).toISOString() : undefined}
          >
            {when}
          </time>
          {" · "}
          {index + 1} of {total}
          {" · "}
          <span>from posts</span>
        </p>
      </div>
    </div>
  );
}
