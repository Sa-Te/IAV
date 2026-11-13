import { residentWindow, type CardTransform } from "@instavault/core";

import { createContext, type GlContext } from "./gl/context.js";
import { createProgram } from "./gl/program.js";
import { createRenderer, type Instance } from "./gl/renderer.js";
import { createTextureWindow } from "./gl/textures.js";
import { projectCards } from "@instavault/core";
import { vortexLayout, pickNearest } from "@instavault/core";

/**
 * Bind the GL pieces to one canvas, or return null.
 *
 * Kept out of React so the route's tests can replace this module wholesale: the
 * component decides *whether* to start, this function decides *how*. The frame
 * loop lives here because it needs the renderer, but it is still caller-driven —
 * the component starts and stops it.
 */

export interface CycloneInput {
  readonly index: number;
  readonly bitmap: () => Promise<ImageBitmap | null>;
}

export interface CycloneHandle {
  stop(): void;
  pointer(x: number, y: number): number | null;
  setPhase(phase: number): void;
  frame(dtMs: number): void;
  stats(): { resident: number; bytes: number; drawCalls: number };
  renderer: string;
}

export interface StartOptions {
  readonly canvas: HTMLCanvasElement;
  readonly items: readonly CycloneInput[];
  readonly reducedMotion: boolean;
  readonly onHighlight?: (index: number | null) => void;
}

const CARD_ASPECT = 0.75;
const MAX_PICK_RADIUS = 72;
const FOV_Y = Math.PI / 3;
const BACKGROUND: readonly [number, number, number] = [0.07, 0.063, 0.055];

export function startCyclone(options: StartOptions): CycloneHandle | null {
  const context: GlContext | null = createContext(options.canvas);
  if (context === null) return null;

  const { gl, caps } = context;
  const program = createProgram(gl);
  const renderer = createRenderer(gl, program);
  const layout: readonly CardTransform[] = vortexLayout(options.items.length, 0, {
    cardAspect: CARD_ASPECT,
  });

  let phase = 0;
  let highlight: number | null = null;
  let drawCalls = 0;

  // One array texture, allocated once: 96 layers of 256² RGBA is ~25 MB (D2).
  const slots = new Map<number, number>();
  const textureObject = gl.createTexture();
  if (textureObject === null) return null;
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureObject);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, 256, 256, 96, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const textures = createTextureWindow(
    {
      layerCount: 96,
      upload(layer, bitmap, index) {
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureObject);
        gl.texSubImage3D(
          gl.TEXTURE_2D_ARRAY,
          0,
          0,
          0,
          layer,
          bitmap.width,
          bitmap.height,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          bitmap,
        );
        slots.set(index, layer);
      },
      clear(layer) {
        for (const [index, value] of slots) if (value === layer) slots.delete(index);
      },
    },
    {
      async request(index) {
        const item = options.items[index];
        return item === undefined ? null : item.bitmap();
      },
    },
  );

  const resize = (): void => {
    const rect = options.canvas.getBoundingClientRect();
    renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
  };
  resize();

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  observer?.observe(options.canvas);

  const width = () => options.canvas.clientWidth || 1;
  const height = () => options.canvas.clientHeight || 1;

  const project = (yaw: number, pitch: number) =>
    projectCards(layout, {
      yaw,
      pitch,
      distance: 9,
      fovY: FOV_Y,
      viewport: { width: width(), height: height() },
    });

  const draw = (yaw: number, pitch: number): void => {
    const screen = project(yaw, pitch);
    const instances: Instance[] = [];
    for (const card of screen) {
      if (!card.visible) continue;
      const layer = slots.get(card.index);
      if (layer === undefined) continue;
      const scale = (layout[card.index]?.scale ?? 1) * 0.09;
      const alpha = 0.55 + 0.45 * Math.min(1, card.depth / 12);
      instances.push({
        x: card.x / width(),
        y: card.y / height(),
        scale: card.index === highlight ? scale * 1.15 : scale,
        layer,
        alpha: card.index === highlight ? 1 : alpha,
      });
    }
    drawCalls = renderer.draw({ instances, background: BACKGROUND });
  };

  void textures.setWindow(residentWindow(options.items.length, 0).concat()).then(() => draw(0, 0));

  return {
    stop() {
      observer?.disconnect();
      textures.close();
      renderer.dispose();
      if (textureObject !== null) gl.deleteTexture(textureObject);
    },
    pointer(x, y) {
      const picked = pickNearest(project(0, 0), { x, y }, MAX_PICK_RADIUS);
      if (picked !== highlight) {
        highlight = picked;
        options.onHighlight?.(picked);
      }
      return picked;
    },
    setPhase(next) {
      phase = next;
      void textures
        .setWindow(residentWindow(options.items.length, Math.floor(phase)))
        .then(() => draw(0, 0));
    },
    // The caller owns the clock; this signature exists so the loop can pass dt
    // once tilt/velocity live in the handle (they do not yet — pointer tilt is M12).
    frame() {
      draw(0, 0);
    },
    stats() {
      const stats = textures.stats();
      return { resident: stats.resident, bytes: stats.bytes, drawCalls };
    },
    renderer: caps.renderer,
  };
}
