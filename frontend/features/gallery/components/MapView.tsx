import { Map } from "lucide-react";

// Phase 3 placeholder — interactive geo map of photos by location EXIF data
export default function MapView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center glass-card">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(0, 163, 196, 0.08)", border: "1px solid rgba(0, 163, 196, 0.2)" }}>
        <Map className="w-9 h-9 text-neon-500" />
      </div>
      <h2 className="text-xl font-bold text-star-200">Map View</h2>
      <p className="text-star-500 text-sm mt-2 max-w-sm">
        An interactive 3D globe showing where your photos were taken — arriving in Phase 3.
      </p>
      <span className="mt-4 stat-badge text-xs">Phase 3</span>
    </div>
  );
}
