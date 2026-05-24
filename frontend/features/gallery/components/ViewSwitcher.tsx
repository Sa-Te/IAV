"use client";

import { LayoutGrid, Rows3, Map, Wind } from "lucide-react";

export type GalleryView = "Grid" | "Timeline" | "Map" | "Cyclone";

interface Props {
  current: GalleryView;
  onChange: (v: GalleryView) => void;
}

const VIEWS: { key: GalleryView; icon: React.ElementType; label: string; phase?: string }[] = [
  { key: "Grid", icon: LayoutGrid, label: "Grid" },
  { key: "Timeline", icon: Rows3, label: "Timeline" },
  { key: "Map", icon: Map, label: "Map", phase: "Phase 3" },
  { key: "Cyclone", icon: Wind, label: "Cyclone", phase: "Phase 4" },
];

export default function ViewSwitcher({ current, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 glass-card p-1 rounded-xl">
      {VIEWS.map(({ key, icon: Icon, label, phase }) => {
        const isActive = current === key;
        const isPlanned = !!phase;
        return (
          <button
            key={key}
            onClick={() => !isPlanned && onChange(key)}
            title={phase ? `${label} — coming in ${phase}` : label}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
              ${isActive ? "bg-neon-500/20 text-neon-300" : "text-star-400 hover:text-star-200"}
              ${isPlanned ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            {phase && (
              <span className="hidden sm:inline text-[9px] font-bold px-1 py-0.5 rounded bg-star-500/20 text-star-400 ml-1">
                {phase}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
