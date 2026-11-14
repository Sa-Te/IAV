import { useCallback, useRef, useState, type JSX } from "react";

import { MediaDetail } from "../media/MediaDetail.js";
import { MediaGrid } from "../media/MediaGrid.js";
import { MediaTimeline } from "../media/MediaTimeline.js";
import { GalleryViewSwitch } from "../media/GalleryViewSwitch.js";
import { useGalleryView } from "../media/useGalleryView.js";
import { useMediaList } from "../media/useMediaList.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { State } from "../ui/State.js";

/**
 * One page, parameterised by category. `/` passes "all"; `/posts`, `/stories`
 * and `/archived` pass one category each. The view does no filtering of its own —
 * `useMediaList` owns that, so a regression to "posts only" cannot hide here.
 */
export function CategoryGallery({
  category,
  title,
}: {
  category: string;
  title: string;
}): JSX.Element {
  const repository = useArchiveRepository();
  const { state, retry } = useMediaList(category);
  const [view, setView] = useGalleryView();
  const [selected, setSelected] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setSelected(null);
    openerRef.current?.focus();
  }, []);

  return (
    <div className="gallery">
      <h1>{title}</h1>

      {state.status === "ready" && <GalleryViewSwitch view={view} onChange={setView} />}

      {state.status === "loading" && <State kind="loading" message="Reading the archive…" />}

      {state.status === "error" && <State kind="error" message={state.message} onRetry={retry} />}

      {state.status === "ready" && state.items.length === 0 && (
        <State
          kind="empty"
          message={`This archive has no ${title.toLowerCase()}.`}
          detail="If you expected media, import your export on the import page."
        />
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <>
          <p className="summary">
            {state.items.length} {state.items.length === 1 ? "item" : "items"}
          </p>
          {view === "timeline" ? (
            <MediaTimeline
              items={state.items}
              source={repository}
              onOpen={(index) => {
                openerRef.current = document.activeElement as HTMLElement | null;
                setSelected(index);
              }}
            />
          ) : (
            <MediaGrid
              items={state.items}
              source={repository}
              onOpen={(index) => {
                openerRef.current = document.activeElement as HTMLElement | null;
                setSelected(index);
              }}
            />
          )}
        </>
      )}

      {state.status === "ready" && selected !== null && state.items[selected] !== undefined && (
        <MediaDetail
          item={state.items[selected]}
          index={selected}
          total={state.items.length}
          source={repository}
          onClose={close}
        />
      )}
    </div>
  );
}
