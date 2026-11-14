import type { MediaItemView } from "@instavault/core";
import { useEffect, useRef, useState, type JSX } from "react";

import { downloadOriginal } from "../download/singleFile.js";
import { useMediaUrl, type MediaSource } from "./useMediaUrl.js";
import { Provenance } from "./Provenance.js";
import { State } from "../ui/State.js";
import { usePrefersReducedMotion } from "../ui/usePrefersReducedMotion.js";

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
  const [idle, setIdle] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const idleTimer = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Controls fade only while the pointer is idle. A keyboard user must never lose
  // them, so any focus inside the dialog pins them visible.
  useEffect(() => {
    // Reduced motion means no disappearing controls: the fade is decoration.
    if (reducedMotion) {
      setIdle(false);
      return;
    }
    const bump = () => {
      setIdle(false);
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setIdle(true), 2500);
    };
    bump();
    window.addEventListener("pointermove", bump);
    return () => {
      window.removeEventListener("pointermove", bump);
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    };
  }, [reducedMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // The dialog is modal: Tab must not walk into the page behind it.
      const dialog = dialogRef.current;
      if (dialog === null) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], video[controls], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = async (): Promise<void> => {
    setDownloading(true);
    setDownloadError(null);
    const result = await downloadOriginal(item.id, source);
    setDownloading(false);
    if (!result.ok) setDownloadError(result.reason);
  };

  const caption = item.caption.trim();
  const when = item.takenAt > 0 ? new Date(item.takenAt * 1000).toLocaleString() : "Date unknown";

  return (
    <div
      ref={dialogRef}
      className={idle ? "detail is-idle" : "detail"}
      role="dialog"
      aria-modal="true"
      aria-label="Media detail"
      onPointerEnter={() => setIdle(false)}
    >
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
          ) : media.mime.startsWith("audio/") ? (
            <audio src={media.url} controls preload="metadata" data-testid="detail-audio" />
          ) : (
            <img src={media.url} alt={caption === "" ? "From your archive" : caption} />
          ))}
      </div>

      <div className="detail-info">
        {caption === "" ? (
          <p className="detail-meta">No caption</p>
        ) : (
          <p className="detail-caption">{caption}</p>
        )}
        <p className="detail-meta">
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
        <Provenance item={item} />
        <div className="detail-actions">
          <button
            type="button"
            className="button"
            onClick={() => void download()}
            disabled={downloading}
          >
            Download original
          </button>
          <span className="detail-quality">
            Original quality — the file as it is in your export.
          </span>
        </div>
        {downloadError !== null && (
          <p className="detail-error" role="alert">
            {downloadError}
          </p>
        )}
      </div>
    </div>
  );
}
