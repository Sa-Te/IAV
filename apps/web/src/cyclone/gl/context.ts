/**
 * WebGL2, or an honest no.
 *
 * `createContext` returns null instead of throwing: "this browser cannot do the
 * 3D view" is a supported outcome (the route falls back to the grid), not an
 * error. The caps are read once and reported, because what breaks first on a weak
 * GPU is a layer limit, not a shader.
 */

export interface ContextCaps {
  readonly maxArrayTextureLayers: number;
  readonly maxTextureSize: number;
  readonly renderer: string;
}

export interface GlContext {
  readonly gl: WebGL2RenderingContext;
  readonly caps: ContextCaps;
}

/** The window needs one layer per resident card (D2). */
export const REQUIRED_LAYERS = 96;

export function createContext(canvas: HTMLCanvasElement): GlContext | null {
  const gl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: false,
    depth: false,
    powerPreference: "low-power",
  });
  if (gl === null) return null;

  const maxArrayTextureLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number;
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

  // A driver with fewer than 96 layers cannot hold the window; refuse now rather
  // than half-render and discover it per upload.
  if (maxArrayTextureLayers < REQUIRED_LAYERS) return null;

  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer =
    debug === null ? "unknown" : String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));

  return { gl, caps: { maxArrayTextureLayers, maxTextureSize, renderer } };
}
