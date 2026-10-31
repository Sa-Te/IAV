"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fixInstagramEncoding } from "@/lib/fixEncoding";
import MediaRenderer from "./MediaRenderer";
import type { MediaItem } from "@/stores/galleryStore";

interface Props {
  items: MediaItem[];
  index: number | null;
  token: string | null;
  onClose: () => void;
  onNav: (i: number) => void;
}

export default function DetailModal({ items, index, token, onClose, onNav }: Props) {
  const item = index !== null ? items[index] : null;

  const prev = useCallback(() => {
    if (index === null) return;
    onNav(index > 0 ? index - 1 : items.length - 1);
  }, [index, items.length, onNav]);

  const next = useCallback(() => {
    if (index === null) return;
    onNav(index < items.length - 1 ? index + 1 : 0);
  }, [index, items.length, onNav]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  const ext = item?.uri.split(".").pop()?.toLowerCase() ?? "";
  const isVideo = ["mp4", "mov", "webm"].includes(ext);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0" style={{ background: "rgba(2, 6, 14, 0.95)", backdropFilter: "blur(20px)" }} />

          {/* Nav arrows */}
          <button onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(0,163,196,0.12)", border: "1px solid rgba(0,163,196,0.3)" }}>
            <ChevronLeft className="w-5 h-5 text-neon-400" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(0,163,196,0.12)", border: "1px solid rgba(0,163,196,0.3)" }}>
            <ChevronRight className="w-5 h-5 text-neon-400" />
          </button>

          {/* Close */}
          <button onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)" }}>
            <X className="w-4 h-4 text-red-400" />
          </button>

          {/* Card */}
          <motion.div
            layoutId={`media-${item.id}`}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "rgba(8, 16, 32, 0.98)",
              border: "1px solid rgba(0,163,196,0.2)",
              boxShadow: "0 0 80px rgba(0,163,196,0.15)",
              maxWidth: isVideo ? "900px" : "680px",
              width: "calc(100vw - 120px)",
              height: "calc(100vh - 80px)",
            }}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            {/* Media — flex-1 min-h-0 so it fills remaining space without pushing info off-screen */}
            <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
              style={{ background: "#000" }}>
              <MediaRenderer uri={item.uri} token={token} />
            </div>

            {/* Info — flex-shrink-0 ensures it's always visible at the bottom */}
            <div className="p-5 overflow-y-auto flex-shrink-0" style={{ maxHeight: "35vh" }}>
              <p className="text-xs text-star-500 mb-2">
                {formatDistanceToNow(new Date(item.taken_at), { addSuffix: true })} ·{" "}
                {new Date(item.taken_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              {item.caption && (
                <p className="text-sm text-star-200 leading-relaxed">
                  {fixInstagramEncoding(item.caption)}
                </p>
              )}
              <div className="flex items-center gap-3 mt-4">
                <span className="text-xs stat-badge">{index! + 1} / {items.length}</span>
                <a
                  href={`/api/v1/mediafile/${item.uri}`}
                  download
                  className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-neon-400 transition-colors hover:bg-neon-500/10"
                  style={{ border: "1px solid rgba(0,163,196,0.2)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
