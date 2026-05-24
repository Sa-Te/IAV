"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Wind, Loader2 } from "lucide-react";
import type { MediaItem } from "@/stores/galleryStore";

// R3F Canvas must be client-only (WebGL uses browser APIs)
const CycloneCanvas = dynamic(() => import("./CycloneCanvas"), { ssr: false });

interface Props {
  items: MediaItem[];
  token: string | null;
  onSelect: (index: number) => void;
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="w-8 h-8 text-neon-500 animate-spin" />
      <p className="text-sm text-star-500">Initialising 3D space…</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center glass-card">
      <Wind className="w-10 h-10 text-neon-500 mb-4" />
      <p className="text-star-400">Upload your archive to explore the Cyclone view.</p>
    </div>
  );
}

export default function CycloneView({ items, token, onSelect }: Props) {
  if (items.length === 0) return <EmptyState />;

  return (
    <div className="glass-card overflow-hidden rounded-2xl" style={{ height: 620 }}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-neon-600/10">
        <Wind className="w-4 h-4 text-neon-500" />
        <span className="text-xs font-semibold text-star-400 uppercase tracking-wider">Cyclone — 3D Memory Helix</span>
        <span className="ml-auto text-[10px] text-star-600">Drag to rotate · Click to open</span>
      </div>
      <Suspense fallback={<LoadingState />}>
        <CycloneCanvas items={items} token={token} onSelect={onSelect} />
      </Suspense>
    </div>
  );
}
