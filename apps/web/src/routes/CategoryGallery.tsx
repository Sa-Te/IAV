import { useCallback, useRef, useState, type JSX } from "react";

import { MediaDetail } from "../media/MediaDetail.js";
import { MediaGrid } from "../media/MediaGrid.js";
import { useMediaList } from "../media/useMediaList.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { Nav } from "./Nav.js";

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
  const { state, retry, counts } = useMediaList(category);
  const [selected, setSelected] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setSelected(null);
    openerRef.current?.focus();
  }, []);

  return (
    <main className="gallery">
      <h1>InstaVault</h1>
      <Nav counts={counts} />

      {state.status === "loading" && <p role="status">Reading the archive…</p>}

      {state.status === "error" && (
        <div role="alert" className="state state-error">
          <p>{state.message}</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <div className="state state-empty">
          <p>This archive has no {title.toLowerCase()}.</p>
          <p>
            If you expected media, import your export on the <a href="/dev/ingest">import page</a>.
          </p>
        </div>
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <>
          <p className="summary">
            {state.items.length} items · {title}
          </p>
          <MediaGrid
            items={state.items}
            source={repository}
            onOpen={(index) => {
              openerRef.current = document.activeElement as HTMLElement | null;
              setSelected(index);
            }}
          />
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
    </main>
  );
}
