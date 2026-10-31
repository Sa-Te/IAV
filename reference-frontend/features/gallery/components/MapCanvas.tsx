"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import type { MediaItem } from "@/stores/galleryStore";

// Bundled topojson — no network request, works fully offline.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const worldAtlas: Record<string, unknown> = require("world-atlas/countries-110m.json");

interface GeoPoint {
  item: MediaItem;
  index: number;
}

interface Props {
  geoPoints: GeoPoint[];
  center: [number, number];
  zoom: number;
  onSelect: (index: number) => void;
}

export default function MapCanvas({ geoPoints, center, zoom, onSelect }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <ComposableMap
      projection="geoMercator"
      style={{ width: "100%", height: "100%", background: "#FAFAFA" }}
    >
      <ZoomableGroup center={center} zoom={zoom} maxZoom={40}>
        <Geographies geography={worldAtlas}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#E9E9E9"
                stroke="#FFFFFF"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover:   { fill: "#DCDCDC", outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {geoPoints.map(({ item, index }) => (
          <Marker
            key={item.id}
            coordinates={[item.longitude!, item.latitude!]}
            onClick={() => onSelect(index)}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          >
            {/* Outer ring on hover */}
            {hovered === item.id && (
              <circle r={9} fill="none" stroke="#111" strokeWidth={1.2} opacity={0.25} />
            )}
            <circle
              r={hovered === item.id ? 5.5 : 4}
              fill={hovered === item.id ? "#111111" : "#333333"}
              style={{ transition: "r 0.12s ease, fill 0.12s ease" }}
            />
          </Marker>
        ))}
      </ZoomableGroup>
    </ComposableMap>
  );
}
