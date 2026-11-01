import type { MediaItemView } from "@instavault/core";
import { useEffect, useState, type JSX } from "react";

import { MediaDetail } from "../media/MediaDetail.js";
import { MediaGrid } from "../media/MediaGrid.js";
import { useMediaList } from "../media/useMediaList.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { State } from "../ui/State.js";
import { usePrefersReducedMotion } from "../ui/usePrefersReducedMotion.js";
import { CycloneStage } from "./CycloneStage.js";
import { startCyclone } from "./startCyclone.js";

/**
 * `/cyclone` — the 3D view, behind a lazy import so its GL code is its own chunk.
 *
 * Three honest ways out: no WebGL2 (grid + a sentence), fewer than eight items
 * (a vortex of three cards is silly), and reduced motion (laid out but still,
 * with an explicit "Start motion"). None of them is a dead canvas.
 */

const MIN_ITEMS = 8;

export function CyclonePage(): JSX.Element {
  const repository = useArchiveRepository();
  const { state, retry } = useMediaList("all");
  const reducedMotion = usePrefersReducedMotion();
  const [opened, setOpened] = useState<MediaItemView | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<MediaItemView>).detail;
      setOpened(detail);
    };
    window.addEventListener("cyclone:open", onOpen);
    return () => window.removeEventListener("cyclone:open", onOpen);
  }, []);

  if (state.status === "loading") {
    return (
      <div className="gallery">
        <h1>Cyclone</h1>
        <State kind="loading" message="Reading the archive…" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="gallery">
        <h1>Cyclone</h1>
        <State kind="error" message={state.message} onRetry={retry} />
      </div>
    );
  }

  const items = state.items;

  const gridFallback = (reason: string): JSX.Element => (
    <div className="gallery">
      <h1>Cyclone</h1>
      <p className="summary">{reason}</p>
      <MediaGrid
        items={items}
        source={repository}
        onOpen={(index) => {
          const item = items[index];
          if (item !== undefined) setOpened(item);
        }}
      />
      {opened !== null && (
        <MediaDetail
          item={opened}
          index={items.indexOf(opened)}
          total={items.length}
          source={repository}
          onClose={() => setOpened(null)}
        />
      )}
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="gallery">
        <h1>Cyclone</h1>
        <State kind="empty" message="This archive has no media to show in 3D." />
      </div>
    );
  }

  if (unavailable) {
    return gridFallback(
      "This browser cannot start the 3D view: it needs WebGL2 with at least 96 texture-array layers.",
    );
  }

  if (items.length < MIN_ITEMS) {
    return gridFallback(
      `The 3D view needs at least ${MIN_ITEMS} media items; this archive has ${items.length}.`,
    );
  }

  return (
    <div className="gallery cyclone-page">
      <h1>Cyclone</h1>
      <CycloneStage
        items={items}
        reducedMotion={reducedMotion}
        onUnavailable={() => setUnavailable(true)}
        start={(canvas, media) => {
          const started = startCyclone({
            canvas,
            items: media.map((item, index) => ({
              index,
              bitmap: async () => {
                // 256px, not the grid's 512px (D3): the cards are small, and the
                // window is what bounds memory.
                const blob = await repository.getMediaBlob(item.id);
                if (blob === null) return null;
                try {
                  return await createImageBitmap(blob, {
                    resizeWidth: 256,
                    resizeHeight: 256,
                    resizeQuality: "medium",
                  });
                } catch {
                  return null;
                }
              },
            })),
            reducedMotion,
          });
          return started;
        }}
      />

      {opened !== null && (
        <MediaDetail
          item={opened}
          index={items.indexOf(opened)}
          total={items.length}
          source={repository}
          onClose={() => setOpened(null)}
        />
      )}
    </div>
  );
}

export default CyclonePage;
