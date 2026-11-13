import type { MediaItemView } from "@instavault/core";
import { useEffect, useRef, useState, type JSX } from "react";

import { cycloneBitmapSource } from "../cyclone/bitmapSource.js";
import { CycloneStage } from "../cyclone/CycloneStage.js";
import { startCyclone, type CycloneHandle } from "../cyclone/startCyclone.js";
import { useMediaList } from "../media/useMediaList.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { State } from "../ui/State.js";

/**
 * `/dev/cyclone-stats` — the numbers the Node lane cannot see.
 *
 * fps over the last 120 frames, draw calls per frame, resident textures and their
 * bytes, and the GPU's own name. Dev only: this is instrumentation, not a product
 * feature, and it must never ship to a user's browser.
 */

const FPS_WINDOW = 120;

export function DevCycloneStats(): JSX.Element {
  const repository = useArchiveRepository();
  const { state } = useMediaList("all");
  const [stats, setStats] = useState({
    fps: 0,
    drawCalls: 0,
    resident: 0,
    bytes: 0,
    renderer: "–",
  });
  const frames = useRef<number[]>([]);
  const handleRef = useRef<CycloneHandle | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = performance.now();
      const recent = frames.current.filter((stamp) => now - stamp < 1000);
      frames.current = recent;
      const handle = handleRef.current;
      if (handle === null) return;
      const snapshot = handle.stats();
      setStats({
        fps: recent.length,
        drawCalls: snapshot.drawCalls,
        resident: snapshot.resident,
        bytes: snapshot.bytes,
        renderer: handle.renderer,
      });
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  if (state.status !== "ready") {
    return (
      <div className="gallery">
        <h1>Cyclone stats</h1>
        <State
          kind={state.status === "loading" ? "loading" : "error"}
          message="Reading the archive…"
        />
      </div>
    );
  }

  const items = state.items;

  return (
    <div className="gallery cyclone-stats">
      <h1>Cyclone stats</h1>
      <p className="summary">
        fps (last {FPS_WINDOW} frames): <strong>{stats.fps}</strong> · draw calls:{" "}
        <strong>{stats.drawCalls}</strong> · resident textures: <strong>{stats.resident}</strong> ·{" "}
        resident bytes: <strong>{stats.bytes.toLocaleString()}</strong>
      </p>
      <p className="summary">GPU: {stats.renderer}</p>

      <CycloneStage
        items={items}
        reducedMotion={false}
        start={(canvas, media) => {
          const handle = startCyclone({
            canvas,
            reducedMotion: false,
            items: cycloneBitmapSource(repository, media),
          });
          if (handle === null) return null;

          const wrapped: CycloneHandle = {
            ...handle,
            frame(dt) {
              frames.current.push(performance.now());
              if (frames.current.length > FPS_WINDOW) frames.current.shift();
              handle.frame(dt);
            },
          };
          handleRef.current = wrapped;
          return wrapped;
        }}
      />
    </div>
  );
}

export type { MediaItemView };
