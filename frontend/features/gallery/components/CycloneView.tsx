import { Wind } from "lucide-react";

// Phase 4 placeholder — WebGL cyclone/vortex 3D photo viewer
export default function CycloneView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center glass-card">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(0, 163, 196, 0.08)", border: "1px solid rgba(0, 163, 196, 0.2)" }}>
        <Wind className="w-9 h-9 text-neon-500" />
      </div>
      <h2 className="text-xl font-bold text-star-200">Cyclone View</h2>
      <p className="text-star-500 text-sm mt-2 max-w-sm">
        A WebGL vortex experience that spirals your photos through time — arriving in Phase 4.
      </p>
      <span className="mt-4 stat-badge text-xs">Phase 4</span>
    </div>
  );
}
