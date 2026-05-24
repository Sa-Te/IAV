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
      style={{ height: "100%", background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#020614"]} />
      <fog attach="fog" args={["#020614", 35, 80]} />
      <CycloneScene items={items} token={token} onSelect={onSelect} />
    </Canvas>
  );
}
