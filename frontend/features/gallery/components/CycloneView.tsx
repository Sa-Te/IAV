"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Wind, Loader2, X } from "lucide-react";
import type { MediaItem } from "@/stores/galleryStore";

// R3F Canvas must be client-only (WebGL uses browser APIs)
const CycloneCanvas = dynamic(() => import("./CycloneCanvas"), { ssr: false });

interface Props {
  items: MediaItem[];
  token: string | null;
  onSelect: (index: number) => void;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  postCount: number;
  storyCount: number;
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      <p className="text-sm text-gray-500">Initialising 3D space…</p>
    </div>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Wind className="w-10 h-10 text-gray-300" />
      <p className="text-gray-500 text-sm">Upload your archive to explore the Memory Helix.</p>
      <button
        onClick={onClose}
        className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
      >
        Go back to grid
      </button>
    </div>
  );
}

export default function CycloneView({ items, token, onSelect, onClose, activeTab, onTabChange, postCount, storyCount }: Props) {
  const tabs = [
    { key: "Posts", count: postCount },
    { key: "Stories", count: storyCount },
  ];

  return (
    <div className="fixed inset-0 z-50" style={{ background: "#FAFAFA" }}>
      {/* Minimal header bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        {/* Left: label */}
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Memory Helix</span>
          <span className="text-[10px] text-gray-400 ml-3 hidden sm:inline">Drag to rotate · Click to open</span>
        </div>

        {/* Centre: glass tab switcher */}
        <div
          className="flex items-center gap-0.5 p-1 rounded-xl"
          style={{
            background: "rgba(0,0,0,0.05)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(0,0,0,0.07)",
          }}
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className="px-4 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                style={
                  isActive
                    ? {
                        background: "#FFFFFF",
                        color: "#111111",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.10)",
                      }
                    : {
                        color: "#888888",
                      }
                }
              >
                {t.key}
                {t.count > 0 && (
                  <span className="ml-1.5 text-[10px]" style={{ opacity: isActive ? 0.45 : 0.35 }}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: close */}
        <button
          onClick={onClose}
          aria-label="Close Cyclone view"
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "rgba(0,0,0,0)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0)"; }}
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Canvas area below header */}
      <div className="absolute inset-0 top-[45px]">
        {items.length === 0 ? (
          <EmptyState onClose={onClose} />
        ) : (
          <Suspense fallback={<LoadingState />}>
            <CycloneCanvas items={items} token={token} onSelect={onSelect} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
