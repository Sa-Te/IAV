"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, Html, OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import type { MediaItem } from "@/stores/galleryStore";
import { fixInstagramEncoding } from "@/lib/fixEncoding";
import MediaRenderer from "./MediaRenderer";

interface Props {
  items: MediaItem[];
  token: string | null;
  onSelect: (index: number) => void;
}

function PhotoCard({ item, token, onClick }: { item: MediaItem; token: string | null; onClick: () => void }) {
  return (
    <Html
      transform
      distanceFactor={6}
      style={{ width: 130, height: 155, pointerEvents: "auto" }}
    >
      <div
        onClick={onClick}
        className="cursor-pointer group"
        style={{
          width: 130,
          height: 155,
          borderRadius: 10,
          overflow: "hidden",
          background: "rgba(8,16,32,0.95)",
          border: "1px solid rgba(0,163,196,0.25)",
          boxShadow: "0 0 18px rgba(0,163,196,0.12)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,163,196,0.7)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 32px rgba(0,163,196,0.35)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,163,196,0.25)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 18px rgba(0,163,196,0.12)";
        }}
      >
        <div style={{ height: 110, overflow: "hidden", background: "#000" }}>
          <MediaRenderer uri={item.uri} token={token} />
        </div>
        <div style={{ padding: "4px 6px" }}>
          <p style={{ fontSize: 9, color: "#7ba3c4", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {fixInstagramEncoding(item.caption) || "No caption"}
          </p>
          <p style={{ fontSize: 8, color: "#3d5a72", marginTop: 2 }}>
            {new Date(item.taken_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Html>
  );
}

export default function CycloneScene({ items, token, onSelect }: Props) {
  const helixRef = useRef<Group>(null);
  const VISIBLE = Math.min(items.length, 60);
  const TURNS = 3;
  const RADIUS = 7;
  const HEIGHT = 28;

  const positions = useMemo(() =>
    items.slice(0, VISIBLE).map((_, i) => {
      const t = i / VISIBLE;
      const angle = t * Math.PI * 2 * TURNS;
      return {
        x: Math.cos(angle) * RADIUS,
        y: t * HEIGHT - HEIGHT / 2,
        z: Math.sin(angle) * RADIUS,
      };
    }),
    [VISIBLE, items]
  );

  useFrame((_, delta) => {
    if (helixRef.current) {
      helixRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <>
      <Stars radius={120} depth={60} count={3000} factor={5} fade speed={0.6} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.2} color="#00a3c4" />
      <pointLight position={[-10, -10, -10]} intensity={0.6} color="#9b59ff" />
      <OrbitControls enablePan={false} minDistance={8} maxDistance={40} />
      <group ref={helixRef}>
        {items.slice(0, VISIBLE).map((item, i) => (
          <group key={item.id} position={[positions[i].x, positions[i].y, positions[i].z]}>
            <PhotoCard item={item} token={token} onClick={() => onSelect(i)} />
          </group>
        ))}
      </group>
    </>
  );
}
