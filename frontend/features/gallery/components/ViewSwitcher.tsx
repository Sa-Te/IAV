"use client";

import { LayoutGrid, Rows3, Map, Wind } from "lucide-react";

export type GalleryView = "Grid" | "Timeline" | "Map" | "Cyclone";

interface Props {
  current: GalleryView;
  onChange: (v: GalleryView) => void;
}

const VIEWS: { key: GalleryView; icon: React.ElementType; label: string; soon?: boolean }[] = [
  { key: "Grid", icon: LayoutGrid, label: "Grid" },
  { key: "Timeline", icon: Rows3, label: "Timeline" },
  { key: "Cyclone", icon: Wind, label: "Cyclone" },
  { key: "Map", icon: Map, label: "Map", soon: true },
];

export default function ViewSwitcher({ current, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 glass-card p-1 rounded-xl">
      {VIEWS.map(({ key, icon: Icon, label, soon }) => {
        const isActive = current === key;
        return (
          <button
            key={key}
            onClick={() => !soon && onChange(key)}
            title={soon ? `${label} — coming soon` : label}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
              ${isActive ? "bg-neon-500/20 text-neon-300 shadow-[0_0_12px_rgba(0,163,196,0.2)]" : "text-star-400 hover:text-star-200"}
              ${soon ? "opacity-35 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
