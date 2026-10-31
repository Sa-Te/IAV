// No top-level imports — keeps this file in "script" (ambient) mode so
// TypeScript treats the declare module block as a global ambient declaration.
declare module "react-simple-maps" {
  import type { CSSProperties, ReactNode, ReactElement, MouseEvent } from "react";

  // ── ComposableMap ─────────────────────────────────────────────────────────
  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    style?: CSSProperties;
    className?: string;
    children?: ReactNode;
  }
  export function ComposableMap(props: ComposableMapProps): ReactElement;

  // ── ZoomableGroup ─────────────────────────────────────────────────────────
  interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    children?: ReactNode;
    className?: string;
    onMoveStart?: (pos: { coordinates: [number, number]; zoom: number }) => void;
    onMove?: (pos: { x: number; y: number; k: number; dragging: boolean }) => void;
    onMoveEnd?: (pos: { coordinates: [number, number]; zoom: number }) => void;
  }
  export function ZoomableGroup(props: ZoomableGroupProps): ReactElement;

  // ── Geographies / Geography ───────────────────────────────────────────────
  interface GeoFeature {
    rsmKey: string;
    [key: string]: unknown;
  }
  interface GeographiesRenderProps {
    geographies: GeoFeature[];
  }
  interface GeographiesProps {
    geography: string | Record<string, unknown>;
    parseGeographies?: (features: unknown[]) => unknown[];
    children: (props: GeographiesRenderProps) => ReactNode;
  }
  export function Geographies(props: GeographiesProps): ReactElement;

  interface GeographyStyleState {
    default?: CSSProperties;
    hover?: CSSProperties;
    pressed?: CSSProperties;
  }
  interface GeographyProps {
    geography: GeoFeature;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: GeographyStyleState;
    className?: string;
    onClick?: (event: MouseEvent<SVGPathElement>) => void;
    onMouseEnter?: (event: MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (event: MouseEvent<SVGPathElement>) => void;
  }
  export function Geography(props: GeographyProps): ReactElement;

  // ── Marker ────────────────────────────────────────────────────────────────
  interface MarkerProps {
    coordinates: [number, number];
    style?: CSSProperties;
    className?: string;
    children?: ReactNode;
    onClick?: (event: MouseEvent<SVGGElement>) => void;
    onMouseEnter?: (event: MouseEvent<SVGGElement>) => void;
    onMouseLeave?: (event: MouseEvent<SVGGElement>) => void;
  }
  export function Marker(props: MarkerProps): ReactElement;
}
