"use client";

import { Canvas } from "@react-three/fiber";
import CycloneScene from "./CycloneScene";
import type { MediaItem } from "@/stores/galleryStore";

interface Props {
  items: MediaItem[];
  token: string | null;
  onSelect: (index: number) => void;
}

export default function CycloneCanvas({ items, token, onSelect }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 22], fov: 55 }}
      style={{ height: "100%", width: "100%", background: "#FAFAFA" }}
      gl={{ antialias: true, alpha: false }}
    >
      <CycloneScene items={items} token={token} onSelect={onSelect} />
    </Canvas>
  );
}
