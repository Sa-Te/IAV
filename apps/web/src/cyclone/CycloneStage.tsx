import { VERTICAL_SPACING, type MediaItemView } from "@instavault/core";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";

import type { CycloneHandle } from "./startCyclone.js";

/** World units per second of idle rotation: slow enough to read, fast enough to notice. */
const VELOCITY = 0.35;

/**
 * The canvas, the hidden keyboard list, and the decisions about motion.
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
}: {
  items: readonly MediaItemView[];
  start: (canvas: HTMLCanvasElement, items: readonly MediaItemView[]) => CycloneHandle | null;
  reducedMotion: boolean;
  onUnavailable?: () => void;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<CycloneHandle | null>(null);
  const phaseRef = useRef(0);
  const pausedRef = useRef(false);

  const [highlight, setHighlight] = useState(0);
  const [paused, setPaused] = useState(false);
  const [motionOptIn, setMotionOptIn] = useState(false);
  const [available, setAvailable] = useState(true);

  // Reduced motion is honoured until the person explicitly opts in, for this
  // session only — there is no stored preference to surprise them later.
  const animate = !reducedMotion || motionOptIn;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || !animate) return;

    const handle = start(canvas, items);
    handleRef.current = handle;
    if (handle === null) {
      setAvailable(false);
      onUnavailable?.();
      return;
    }

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!pausedRef.current) {
        phaseRef.current += (VELOCITY * dt) / 1000;
        handle.setPhase(phaseRef.current);
      }
      handle.frame(dt);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      handle.stop();
      handleRef.current = null;
    };
  }, [animate, items, start, onUnavailable]);

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
    phaseRef.current += delta * VERTICAL_SPACING;
    handleRef.current?.setPhase(phaseRef.current);
  };

  return (
    <div
      className="cyclone"
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
      <p className="summary">
        Arrow keys move through the archive, Enter opens the highlighted item, Space pauses the
        rotation.
      </p>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="cyclone-canvas"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          handleRef.current?.pointer(event.clientX - rect.left, event.clientY - rect.top);
        }}
        onClick={() => openDetail(highlight)}
      />

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

      {!available && (
        <p className="summary">
          This browser cannot start the 3D view. The grid below shows the same items.
        </p>
      )}

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
