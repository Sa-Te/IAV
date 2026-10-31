"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { fixInstagramEncoding } from "@/lib/fixEncoding";
import MediaRenderer from "./MediaRenderer";
import type { MediaItem } from "@/stores/galleryStore";

interface Props {
  media: MediaItem[];
  token: string | null;
  onSelect: (index: number) => void;
}

export default function GridView({ media, token, onSelect }: Props) {
  if (media.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {media.map((item, idx) => {
        const ext = item.uri.split(".").pop()?.toLowerCase() ?? "";
        const isVideo = ["mp4", "mov", "webm"].includes(ext);
        return (
          <motion.div
            key={item.id}
            layoutId={`media-${item.id}`}
            onClick={() => onSelect(idx)}
            className="glass-card overflow-hidden cursor-pointer group"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="aspect-square overflow-hidden bg-nebula-800 relative">
              <MediaRenderer uri={item.uri} token={token} />
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.6)", border: "1.5px solid rgba(255,255,255,0.35)" }}>
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                <p className="text-xs text-white line-clamp-2">{fixInstagramEncoding(item.caption) || "No caption"}</p>
              </div>
            </div>
            <div className="px-2 py-1.5">
              <p className="text-[10px] text-star-500">{new Date(item.taken_at).toLocaleDateString()}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
