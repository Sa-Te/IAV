import {
  camera,
  CARD_SIZE_SHARE,
  focusedIndex,
  NO_TILT,
  residentWindow,
  type CardTransform,
  type Tilt,
} from "@instavault/core";

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
  setTilt(tilt: Tilt): void;
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
const CAMERA = camera();
/**
 * How far from a card's centre a pointer still counts as being on it. Cards are
 * a tenth of the canvas wide, so a fixed 72px radius made most of a card dead
 * space and every click resolved to nothing (M17 point 3).
 */
const PICK_RADIUS_SHARE = 0.12;
const MIN_PICK_RADIUS = 72;
const BACKGROUND: readonly [number, number, number] = [0.07, 0.063, 0.055];

export function startCyclone(options: StartOptions): CycloneHandle | null {
  const context: GlContext | null = createContext(options.canvas);
  if (context === null) return null;

  const { gl, caps } = context;
  const program = createProgram(gl);
  const renderer = createRenderer(gl, program);

  let phase = 0;
  let tilt: Tilt = NO_TILT;
  let highlight: number | null = null;
  let drawCalls = 0;

  // One array texture, allocated once: 96 layers of 256² RGBA is ~25 MB (D2).
  const slots = new Map<number, number>();
  // Each card keeps its picture's own shape. A fixed quad stretched every landscape
  // photo to portrait and back (M17 point 1).
  const aspects = new Map<number, number>();
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
        aspects.set(index, bitmap.width / bitmap.height);
      },
      clear(layer) {
        for (const [index, value] of slots) {
          if (value !== layer) continue;
          slots.delete(index);
          aspects.delete(index);
        }
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

  // The layout is a function of the phase, so it is built for the frame being
  // drawn. Building it once and scrolling the window over it meant the cards
  // never moved: the phase was only a texture-window number.
  const layoutAt = (at: number): readonly CardTransform[] =>
    vortexLayout(options.items.length, at, {
      cardAspect: CARD_ASPECT,
      viewport: { width: width(), height: height() },
    });

  const project = (at: number, view: Tilt) =>
    projectCards(layoutAt(at), {
      yaw: view.yaw,
      pitch: view.pitch,
      distance: 9,
      fovY: CAMERA.fovY,
      viewport: { width: width(), height: height() },
    });

  const draw = (): void => {
    const layout = layoutAt(phase);
    const screen = project(phase, tilt);
    const instances: Instance[] = [];
    for (const card of screen) {
      if (!card.visible) continue;
      const layer = slots.get(card.index);
      if (layer === undefined) continue;
      const aspect = aspects.get(card.index);
      if (aspect === undefined || !Number.isFinite(aspect) || aspect <= 0) continue;
      const scaleX = (layout[card.index]?.scale ?? 1) * CARD_SIZE_SHARE;
      // A quad is normalised per canvas axis, so equal numbers are not a square:
      // the height has to carry the canvas aspect divided by the picture's.
      const scaleY = (scaleX * (width() / height())) / aspect;
      const alpha = 0.55 + 0.45 * Math.min(1, card.depth / 12);
      instances.push({
        x: card.x / width(),
        y: card.y / height(),
        scaleX: card.index === highlight ? scaleX * 1.15 : scaleX,
        scaleY: card.index === highlight ? scaleY * 1.15 : scaleY,
        layer,
        alpha: card.index === highlight ? 1 : alpha,
      });
    }
    drawCalls = renderer.draw({ instances, background: BACKGROUND });
  };

  void textures.setWindow(residentWindow(options.items.length, 0).concat()).then(() => draw());

  return {
    stop() {
      observer?.disconnect();
      textures.close();
      renderer.dispose();
      if (textureObject !== null) gl.deleteTexture(textureObject);
    },
    pointer(x, y) {
      const radius = Math.max(MIN_PICK_RADIUS, width() * PICK_RADIUS_SHARE);
      const picked = pickNearest(project(phase, tilt), { x, y }, radius);
      if (picked !== highlight) {
        highlight = picked;
        options.onHighlight?.(picked);
      }
      return picked;
    },
    setPhase(next) {
      phase = next;
      void textures
        .setWindow(residentWindow(options.items.length, focusedIndex(options.items.length, phase)))
        .then(() => draw());
    },
    setTilt(next) {
      tilt = next;
    },
    // The caller owns the clock: it advances the phase and the tilt, then asks for
    // a frame. Nothing here reads time (AGENTS.md §3, one physics path).
    frame() {
      draw();
    },
    stats() {
      const stats = textures.stats();
      return { resident: stats.resident, bytes: stats.bytes, drawCalls };
    },
    renderer: caps.renderer,
  };
}
