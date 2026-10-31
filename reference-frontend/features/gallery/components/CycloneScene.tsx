"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { FogExp2, Color } from "three";
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
        className="cursor-pointer"
        style={{
          width: 130,
          height: 155,
          borderRadius: 8,
          overflow: "hidden",
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
          transition: "box-shadow 0.2s, transform 0.2s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.boxShadow = "0 8px 32px rgba(0,0,0,0.14)";
          el.style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)";
          el.style.transform = "scale(1)";
        }}
      >
        <div style={{ height: 110, overflow: "hidden", background: "#F2F2F2" }}>
          <MediaRenderer uri={item.uri} token={token} />
        </div>
        <div style={{ padding: "5px 7px" }}>
          <p style={{ fontSize: 9, color: "#333", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontFamily: "serif" }}>
            {fixInstagramEncoding(item.caption) || "—"}
          </p>
          <p style={{ fontSize: 8, color: "#999", marginTop: 2, letterSpacing: "0.02em" }}>
            {new Date(item.taken_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Html>
  );
}

export default function CycloneScene({ items, token, onSelect }: Props) {
  const { scene } = useThree();
  const helixRef = useRef<Group>(null);

  useEffect(() => {
    scene.background = new Color("#FAFAFA");
    scene.fog = new FogExp2("#FAFAFA", 0.014);
    return () => {
      scene.background = null;
      scene.fog = null;
    };
  }, [scene]);

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
      <ambientLight intensity={2.0} color="#FFFFFF" />
      <directionalLight position={[10, 15, 10]} intensity={0.5} color="#FFFFFF" />
      <directionalLight position={[-10, -5, -10]} intensity={0.2} color="#F8F8FF" />
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
