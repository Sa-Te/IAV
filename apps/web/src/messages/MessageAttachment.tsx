import type { ThreadAttachment } from "@instavault/core";
import { useEffect, useState, type JSX } from "react";

import { formatDuration } from "../media/format.js";
import { posterStoreOf, requestPoster, type PosterSource } from "../media/poster.js";
import { useMediaUrl, type MediaSource } from "../media/useMediaUrl.js";

/**
 * One message attachment, inline beneath the message text (D4).
 *
 * A photo is an image, a video is a video with its poster and duration, an audio
 * file is a player. The type label is always present; dimensions/duration are
 * shown only when the browser actually knows them, because the export carries no
 * width, height or duration field (docs/T5-DESIGN.md §3).
 */

const LABELS: Readonly<Record<ThreadAttachment["kind"], string>> = {
  photo: "Photo",
  video: "Video",
  audio: "Audio",
  gif: "GIF",
};

export function MessageAttachment({
  attachment,
  source,
}: {
  attachment: ThreadAttachment;
  source: MediaSource;
}): JSX.Element {
  const media = useMediaUrl(attachment.uri, source);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [duration, setDuration] = useState("");
  const [poster, setPoster] = useState<string | null>(null);
  const label = LABELS[attachment.kind];
  const isVideo = media.status === "ready" && media.mime.startsWith("video/");

  useEffect(() => {
    if (!isVideo) return;
    const store = posterStoreOf(source as PosterSource);
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      const blob = await source.getMediaBlob(attachment.uri);
      if (blob === null || store === null) return;
      const result = await requestPoster(attachment.uri, blob, store);
      if (cancelled || result === null) return;
      objectUrl = URL.createObjectURL(result);
      setPoster(objectUrl);
    })();

    return () => {
      cancelled = true;
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.uri, isVideo, source]);

  if (media.status === "pending") {
    return <p className="message-attachment-note">Loading {label.toLowerCase()}…</p>;
  }
  if (media.status === "failed") {
    return <p className="message-attachment-note">{label} not stored in this export.</p>;
  }

  const meta = [
    size === null ? "" : `${size.width} × ${size.height}`,
    duration === "" ? "" : duration,
  ]
    .filter((part) => part !== "")
    .join(" · ");

  return (
    <figure className="message-attachment">
      {attachment.kind === "audio" ? (
        <audio
          controls
          preload="metadata"
          src={media.url}
          data-testid="attachment-audio"
          onLoadedMetadata={(event) => setDuration(formatDuration(event.currentTarget.duration))}
        />
      ) : isVideo ? (
        <video
          controls
          preload="metadata"
          src={media.url}
          poster={poster ?? undefined}
          data-testid="attachment-video"
          onLoadedMetadata={(event) => setDuration(formatDuration(event.currentTarget.duration))}
        />
      ) : (
        <img
          src={media.url}
          alt={`${label} attachment`}
          loading="lazy"
          data-testid="attachment-image"
          onLoad={(event) =>
            setSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }
        />
      )}
      <figcaption className="message-attachment-label">
        {label}
        {meta === "" ? "" : ` · ${meta}`}
      </figcaption>
    </figure>
  );
}
