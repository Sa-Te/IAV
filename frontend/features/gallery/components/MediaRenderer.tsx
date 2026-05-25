"use client";

import { useEffect, useState } from "react";

// Session-scoped cache: blob URLs persist across tab switches / remounts.
// Keys are `uri` strings; we never revoke entries so switching tabs doesn't
// re-fetch media that was already loaded this session.
const blobCache = new Map<string, string>();

interface Props {
  uri: string;
  token: string | null;
}

export default function MediaRenderer({ uri, token }: Props) {
  const [mediaSrc, setMediaSrc] = useState<string | null>(() => blobCache.get(uri) ?? null);

  useEffect(() => {
    if (blobCache.has(uri)) {
      setMediaSrc(blobCache.get(uri)!);
      return;
    }

    let isMounted = true;

    const load = async () => {
      if (!token || !uri) return;
      try {
        const res = await fetch(`/api/v1/mediafile/${uri}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        blobCache.set(uri, url);
        if (isMounted) setMediaSrc(url);
      } catch {
        if (isMounted) setMediaSrc(null);
      }
    };

    load();
    return () => { isMounted = false; };
    // Object URLs in blobCache are intentionally not revoked on unmount.
  }, [uri, token]);

  if (!mediaSrc) {
    return <div className="w-full h-full shimmer rounded-t-xl" />;
  }

  const ext = uri.split(".").pop()?.toLowerCase() ?? "";

  if (["mp4", "mov", "webm"].includes(ext)) {
    return (
      <video
        controls
        className="max-w-full max-h-full"
        style={{ aspectRatio: "auto" }}
      >
        <source src={mediaSrc} type={ext === "mov" ? "video/quicktime" : `video/${ext}`} />
      </video>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediaSrc} alt={uri} className="max-w-full max-h-full object-contain" />;
}
