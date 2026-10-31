"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { X, Map, Loader2, MapPin } from "lucide-react";
import type { MediaItem } from "@/stores/galleryStore";

// SSR disabled — react-simple-maps uses DOM event listeners
const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false });

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
      <p className="text-sm text-gray-500">Rendering map…</p>
    </div>
  );
}

function NoCoords({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <MapPin className="w-10 h-10 text-gray-300" />
      <p className="text-gray-500 text-sm text-center max-w-xs">
        No location data found for this set.<br />
        Re-upload your archive after enabling location on posts, or switch to Posts tab.
      </p>
      <button
        onClick={onClose}
        className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
      >
        Go back to grid
      </button>
    </div>
  );
}

export default function MapView({ items, token: _token, onSelect, onClose, activeTab, onTabChange, postCount, storyCount }: Props) {
  const tabs = [
    { key: "Posts", count: postCount },
    { key: "Stories", count: storyCount },
  ];

  // Only posts can have EXIF GPS — stories never include coordinates.
  const geoPoints = useMemo(() =>
    items.flatMap((item, index) =>
      item.latitude != null && item.longitude != null
        ? [{ item, index }]
        : []
    ),
    [items]
  );

  // Auto-centre on the centroid of all plotted points; fall back to world view.
  const center = useMemo((): [number, number] => {
    if (geoPoints.length === 0) return [0, 20];
    const avgLng = geoPoints.reduce((s, p) => s + p.item.longitude!, 0) / geoPoints.length;
    const avgLat = geoPoints.reduce((s, p) => s + p.item.latitude!, 0) / geoPoints.length;
    return [avgLng, avgLat];
  }, [geoPoints]);

  // Compute a reasonable starting zoom from the bounding box of all points.
  const zoom = useMemo(() => {
    if (geoPoints.length === 0) return 1;
    const lats = geoPoints.map((p) => p.item.latitude!);
    const lngs = geoPoints.map((p) => p.item.longitude!);
    const span = Math.max(
      Math.max(...lats) - Math.min(...lats),
      Math.max(...lngs) - Math.min(...lngs),
    );
    if (span < 0.2) return 40;
    if (span < 1)   return 20;
    if (span < 3)   return 10;
    if (span < 8)   return 5;
    if (span < 20)  return 3;
    return 1.5;
  }, [geoPoints]);

  return (
    <div className="fixed inset-0 z-50" style={{ background: "#FAFAFA" }}>
      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        {/* Left */}
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Memory Map</span>
          <span className="text-[10px] text-gray-400 ml-3 hidden sm:inline">Scroll to zoom · Drag to pan · Click to open</span>
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
                    ? { background: "#FFFFFF", color: "#111111", boxShadow: "0 1px 6px rgba(0,0,0,0.10)" }
                    : { color: "#888888" }
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
          aria-label="Close map view"
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0)"; }}
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Map */}
      <div className="absolute inset-0 top-[45px]">
        {geoPoints.length === 0 ? (
          <NoCoords onClose={onClose} />
        ) : (
          <Suspense fallback={<LoadingState />}>
            <MapCanvas
              geoPoints={geoPoints}
              center={center}
              zoom={zoom}
              onSelect={onSelect}
            />
          </Suspense>
        )}
      </div>

      {/* Bottom-left: photo count badge */}
      {geoPoints.length > 0 && (
        <div
          className="absolute bottom-5 left-6 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <MapPin className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-600 font-medium">
            {geoPoints.length} photo{geoPoints.length !== 1 ? "s" : ""} with location
          </span>
        </div>
      )}
    </div>
  );
}
