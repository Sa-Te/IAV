import {
  advance,
  easeTilt,
  NO_TILT,
  PHASE_PER_PIXEL,
  reducePhase,
  stillPhase,
  tiltTarget,
  VERTICAL_SPACING,
  type MediaItemView,
  type Tilt,
} from "@instavault/core";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";

import type { CycloneHandle } from "./startCyclone.js";

/** A pointer that travelled further than this between press and release is a drag, not a click. */
const CLICK_SLOP_PX = 8;

/** If nothing has a texture this long after starting, say so instead of showing black. */
const EMPTY_SCENE_DEADLINE_MS = 4000;

/**
 * The canvas, the hidden keyboard list, and the decisions about motion.
 *
 * All three interactions — pointer tilt, wheel and drag — only *decide a
 * velocity*; the arithmetic is in `@instavault/core`'s cyclone motion module, and
 * the phase only ever changes through `advance()` (AGENTS.md §3, one physics
 * path). Reduced motion is enforced inside that module, so a listener that
 * forgets it still cannot move the vortex.
 *
 * The canvas is `aria-hidden` and never a tab stop: the same sequence is exposed
 * as a visually-hidden list of real buttons, ordered exactly as the cyclone lays
 * the cards out. Focus and highlight are kept in step, so a sighted keyboard user
 * sees what they are selecting.
 */
export function CycloneStage({
  items,
  start,
  reducedMotion,
  onUnavailable,
  onEmpty,
}: {
  items: readonly MediaItemView[];
  start: (canvas: HTMLCanvasElement, items: readonly MediaItemView[]) => CycloneHandle | null;
  reducedMotion: boolean;
  onUnavailable?: () => void;
  /** The window settled with no texture at all: the route shows the grid instead. */
  onEmpty?: () => void;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<CycloneHandle | null>(null);
  const motionRef = useRef(stillPhase());
  const tiltRef = useRef<Tilt>(NO_TILT);
  const tiltTargetRef = useRef<Tilt>(NO_TILT);
  const dragRef = useRef<{ y: number; at: number } | null>(null);
  // Callbacks are read through refs so a caller's inline arrow cannot restart the
  // scene. It did: every parent render (the stats overlay ticks twice a second)
  // re-created the handle, re-requested 96 textures and threw away the pixels
  // that were in flight — 16 GL contexts in nine seconds on a real archive.
  const startRef = useRef(start);
  const onUnavailableRef = useRef(onUnavailable);
  const onEmptyRef = useRef(onEmpty);
  // Survives the release: the click that follows a drag must not open a card.
  const dragMovedRef = useRef(0);
  const pausedRef = useRef(false);

  const [highlight, setHighlight] = useState(0);
  const [regionFocused, setRegionFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [motionOptIn, setMotionOptIn] = useState(false);
  const [available, setAvailable] = useState(true);

  // Reduced motion is honoured until the person explicitly opts in, for this
  // session only — there is no stored preference to surprise them later.
  const animate = !reducedMotion || motionOptIn;

  useEffect(() => {
    startRef.current = start;
    onUnavailableRef.current = onUnavailable;
    onEmptyRef.current = onEmpty;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || !animate) return;

    const handle = startRef.current(canvas, items);
    handleRef.current = handle;
    if (handle === null) {
      setAvailable(false);
      onUnavailableRef.current?.();
      return;
    }

    const pushPhase = (): void => {
      handle.setPhase(motionRef.current.phase);
    };

    const onWheel = (event: WheelEvent): void => {
      // The vortex owns the wheel while it is running: without this the page
      // scrolls underneath the cards and the archive jumps out of view.
      event.preventDefault();
      motionRef.current = reducePhase(
        motionRef.current,
        { type: "wheel", deltaY: event.deltaY },
        reducedMotion,
      );
      pushPhase();
    };

    const onPointerDown = (event: PointerEvent): void => {
      dragRef.current = { y: event.clientY, at: event.timeStamp };
      dragMovedRef.current = 0;
      canvas.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      tiltTargetRef.current = tiltTarget(
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height,
      );

      const drag = dragRef.current;
      if (drag === null) return;
      // Dragging down moves the sequence down, which is a falling phase.
      const deltaPhase = -(event.clientY - drag.y) * PHASE_PER_PIXEL;
      const dtMs = Math.max(1, event.timeStamp - drag.at);
      dragMovedRef.current += Math.abs(event.clientY - drag.y);
      dragRef.current = { y: event.clientY, at: event.timeStamp };
      motionRef.current = reducePhase(
        motionRef.current,
        { type: "drag", deltaPhase, dtMs },
        reducedMotion,
      );
      pushPhase();
    };

    const onPointerUp = (event: PointerEvent): void => {
      dragRef.current = null;
      canvas.releasePointerCapture?.(event.pointerId);
    };

    const onPointerLeave = (): void => {
      // Leaving the canvas levels the column again; the drag can continue while
      // the pointer is captured, so only the tilt target resets.
      if (dragRef.current === null) tiltTargetRef.current = NO_TILT;
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);

    let frame = 0;
    let last = performance.now();
    const startedAt = last;
    let reportedEmpty = false;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;

      tiltRef.current = easeTilt(tiltRef.current, tiltTargetRef.current, dt, reducedMotion);
      handle.setTilt(tiltRef.current);

      if (!pausedRef.current) {
        motionRef.current = reducePhase(
          motionRef.current,
          { type: "tick", dtMs: dt },
          reducedMotion,
        );
        handle.setPhase(motionRef.current.phase);
      }
      handle.frame(dt);

      // A deadline, not a hope: a black canvas is not an answer (AGENTS.md §7).
      if (!reportedEmpty && now - startedAt > EMPTY_SCENE_DEADLINE_MS) {
        reportedEmpty = true;
        if (handle.stats().resident === 0) onEmptyRef.current?.();
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      handle.stop();
      handleRef.current = null;
    };
  }, [animate, items, reducedMotion]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const openDetail = useCallback(
    (index: number) => {
      const item = items[index];
      if (item === undefined) return;
      setHighlight(index);
      // A custom event keeps the GL layer and the detail view unaware of each other.
      window.dispatchEvent(new CustomEvent<MediaItemView>("cyclone:open", { detail: item }));
    },
    [items],
  );

  const move = (delta: number) => {
    const next = (highlight + delta + items.length) % items.length;
    setHighlight(next);
    // One discrete step, through the same arithmetic as everything else.
    motionRef.current = {
      ...motionRef.current,
      phase: advance(motionRef.current.phase, 1, delta * VERTICAL_SPACING),
    };
    handleRef.current?.setPhase(motionRef.current.phase);
  };

  return (
    <div
      className="cyclone"
      // Only keys that originate inside this region are consumed. A global
      // listener would steal arrows from the rest of the page and scroll the
      // document under the canvas, which is exactly the reported bug.
      onFocus={() => setRegionFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setRegionFocused(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "Enter") {
          event.preventDefault();
          openDetail(highlight);
        } else if (event.key === " ") {
          event.preventDefault();
          setPaused((value) => !value);
        }
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="cyclone-canvas"
        onClick={() => {
          // A drag that ended here is not a click on the highlighted card.
          if (dragMovedRef.current > CLICK_SLOP_PX) return;
          openDetail(highlight);
        }}
      />

      {/* Instructions float over the canvas, top-left: they must be readable, and
          they must not push the canvas down by a single pixel. */}
      <div className="cyclone-overlay cyclone-overlay-top">
        <p className="cyclone-note" id="cyclone-help">
          Arrow keys move through the archive, Enter opens the highlighted item, Space pauses the
          rotation. Dragging, the wheel or the pointer tilt the vortex.
        </p>

        {!regionFocused && (
          <p className="cyclone-note" id="cyclone-hint">
            Press Tab to enter the 3D view controls. The page scrolls normally until you do.
          </p>
        )}

        {!available && (
          <p className="cyclone-note">
            This browser cannot start the 3D view. The grid below shows the same items.
          </p>
        )}
      </div>

      {/* The controls float, bottom-centre and compact: a full-width bar over a
          full-bleed canvas is a second page. */}
      <div className="cyclone-overlay cyclone-overlay-bottom">
        {reducedMotion && !motionOptIn && (
          <button type="button" className="button" onClick={() => setMotionOptIn(true)}>
            Start motion
          </button>
        )}

        <button
          type="button"
          className="button"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? "Resume motion" : "Pause motion"}
        </button>
      </div>

      <ul className="visually-hidden" aria-label="All media, in cyclone order">
        {items.map((item, index) => (
          <li key={`${item.category}:${item.id}:${index}`}>
            <button
              type="button"
              aria-current={index === highlight}
              onFocus={() => setHighlight(index)}
              onClick={() => openDetail(index)}
            >
              {item.caption.trim() === "" ? `Item ${index + 1}` : item.caption}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
