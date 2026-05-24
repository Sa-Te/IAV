"use client";

import MediaRenderer from "./MediaRenderer";
import { MediaItem } from "./GridView";
import { fixInstagramEncoding } from "@/lib/fixEncoding";

interface Props {
  groupedMedia: Record<string, MediaItem[]>;
  token: string | null;
}

export default function TimelineView({ groupedMedia, token }: Props) {
  const months = Object.keys(groupedMedia);
  if (months.length === 0) return null;

  return (
    <div className="space-y-12">
      {months.map((month) => (
        <section key={month}>
          <div className="flex items-center gap-3 mb-4 sticky top-0 py-3 z-10"
            style={{ background: "rgba(5, 11, 24, 0.9)", backdropFilter: "blur(8px)" }}>
            <div className="h-px flex-1 bg-gradient-to-r from-neon-500/30 to-transparent" />
            <h2 className="text-sm font-semibold text-neon-400 tracking-wider uppercase">{month}</h2>
            <span className="stat-badge">{groupedMedia[month].length}</span>
            <div className="h-px flex-1 bg-gradient-to-l from-neon-500/30 to-transparent" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {groupedMedia[month].map((item) => (
              <div key={item.id} className="glass-card overflow-hidden hover:border-neon-500/40 transition-all duration-200">
                <div className="aspect-square overflow-hidden bg-nebula-700">
                  <MediaRenderer uri={item.uri} token={token} />
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-star-300 truncate">{fixInstagramEncoding(item.caption) || "No caption"}</p>
                  <p className="text-[10px] text-star-500 mt-0.5">{new Date(item.taken_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
