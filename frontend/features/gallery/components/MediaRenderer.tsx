"use client";

import { useEffect, useState } from "react";

interface Props {
  uri: string;
  token: string | null;
}

export default function MediaRenderer({ uri, token }: Props) {
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const load = async () => {
      if (!token || !uri) return;
      try {
        const res = await fetch(`http://localhost:8080/api/v1/mediafile/${uri}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (isMounted) setMediaSrc(objectUrl);
      } catch {
        if (isMounted) setMediaSrc(null);
      }
    };

    load();
    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, token]);

  if (!mediaSrc) {
    return <div className="w-full h-full shimmer rounded-t-xl" />;
  }

  const ext = uri.split(".").pop()?.toLowerCase() ?? "";

  if (["mp4", "mov", "webm"].includes(ext)) {
    return (
      <video controls className="w-full h-full object-cover rounded-t-xl">
        <source src={mediaSrc} type={ext === "mov" ? "video/quicktime" : `video/${ext}`} />
      </video>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediaSrc} alt={uri} className="w-full h-full object-cover rounded-t-xl" />;
}
