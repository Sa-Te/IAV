"use client";

import MediaRenderer from "./MediaRenderer";
import { fixInstagramEncoding } from "@/lib/fixEncoding";

export interface MediaItem {
  id: number;
  user_id: number;
  uri: string;
  caption: string;
  taken_at: string;
  media_type: string;
}

interface Props {
  media: MediaItem[];
  token: string | null;
}

export default function GridView({ media, token }: Props) {
  if (media.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {media.map((item) => (
        <div key={item.id} className="glass-card overflow-hidden group hover:border-neon-500/40 transition-all duration-200">
          <div className="aspect-square overflow-hidden bg-nebula-700">
            <MediaRenderer uri={item.uri} token={token} />
          </div>
          <div className="p-3">
            <p className="text-xs text-star-300 truncate">{fixInstagramEncoding(item.caption) || "No caption"}</p>
            <p className="text-[10px] text-star-500 mt-1">{new Date(item.taken_at).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
