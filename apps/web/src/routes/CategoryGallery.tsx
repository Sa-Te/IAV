import {
  createSelection,
  selectAll,
  selectRange,
  toggle,
  clear,
  deselect,
  toMediaTimeline,
  type MediaItemView,
  type SelectionState,
} from "@instavault/core";
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useLocation } from "react-router-dom";

import { MediaDetail } from "../media/MediaDetail.js";
import { MediaGrid } from "../media/MediaGrid.js";
import { MediaTimeline } from "../media/MediaTimeline.js";
import { GalleryViewSwitch } from "../media/GalleryViewSwitch.js";
import { SelectionBar } from "../media/SelectionBar.js";
import { useGalleryView } from "../media/useGalleryView.js";
import { useMediaList } from "../media/useMediaList.js";
import { useMediaSizes } from "../media/useMediaSizes.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { State } from "../ui/State.js";

const NO_ITEMS: readonly MediaItemView[] = [];

/**
 * Every id in the order the reader sees it. The grid renders the list order; the
 * Timeline regroups it year → month → undated, so a shift-click range there must
 * follow the same order or it would jump between months the reader sees as far
 * apart.
 */
function orderedIdsFor(view: "grid" | "timeline", items: readonly MediaItemView[]): string[] {
  if (view === "grid") return items.map((item) => item.id);
  const timeline = toMediaTimeline(items);
  return [
    ...timeline.years.flatMap((year) => year.months.flatMap((month) => month.items)),
    ...timeline.undated,
  ].map((entry) => entry.item.id);
}

/**
 * One page, parameterised by category. `/` passes "all"; `/posts`, `/stories`
 * and `/archived` pass one category each. The view does no filtering of its own —
 * `useMediaList` owns that, so a regression to "posts only" cannot hide here.
 *
 * Selection (D1) lives here, per view, keyed by archive path. It survives a
 * re-render — view switch, list refresh, page change — and is cleared by a route
 * change, because the pathname is the reset key. It is never persisted: a reload
 * or a navigation starts from nothing.
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
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const sizes = useMediaSizes();
  const anchorRef = useRef<string | null>(null);
  const selectRef = useRef<HTMLButtonElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const wasSelecting = useRef(false);
  const pathname = useLocation().pathname;

  const selecting = selection !== null;
  const items = state.status === "ready" ? state.items : NO_ITEMS;
  const orderedIds = useMemo(() => orderedIdsFor(view, items), [view, items]);

  const closeDetail = useCallback(() => {
    setDetailIndex(null);
    openerRef.current?.focus();
  }, []);

  const exitSelection = useCallback(() => {
    setSelection(null);
    anchorRef.current = null;
  }, []);

  // D1: a different route is a different view. The effect also covers leaving and
  // returning to the same gallery, which must start with nothing selected.
  useEffect(() => {
    setSelection(null);
    anchorRef.current = null;
    setDetailIndex(null);
  }, [pathname]);

  // Escape leaves selection mode; the detail view owns Escape when it is open.
  useEffect(() => {
    if (!selecting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      exitSelection();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selecting, exitSelection]);

  // Focus follows the mode: the bar announces itself on entry, and leaving
  // returns the reader to the control that started it.
  useEffect(() => {
    if (selecting) barRef.current?.focus();
    else if (wasSelecting.current) selectRef.current?.focus();
    wasSelecting.current = selecting;
  }, [selecting]);

  const enterSelection = () => {
    // The control is disabled until sizes are read, so this is never a guess.
    if (sizes === null) return;
    setDetailIndex(null);
    anchorRef.current = null;
    setSelection(createSelection(sizes));
  };

  const toggleItem = useCallback(
    (id: string, shiftKey: boolean) => {
      const anchor = anchorRef.current;
      if (shiftKey && anchor !== null && anchor !== id) {
        setSelection((previous) =>
          previous === null ? previous : selectRange(previous, orderedIds, anchor, id),
        );
        return;
      }
      anchorRef.current = id;
      setSelection((previous) => (previous === null ? previous : toggle(previous, id)));
    },
    [orderedIds],
  );

  const setMany = useCallback((ids: readonly string[], selected: boolean) => {
    setSelection((previous) =>
      previous === null ? previous : selected ? selectAll(previous, ids) : deselect(previous, ids),
    );
  }, []);

  return (
    <div className="gallery">
      <h1>{title}</h1>

      {state.status === "ready" && !selecting && (
        <div className="gallery-toolbar">
          <GalleryViewSwitch view={view} onChange={setView} />
          <button
            ref={selectRef}
            type="button"
            className="button button-quiet"
            onClick={enterSelection}
            disabled={sizes === null || items.length === 0}
          >
            Select
          </button>
        </div>
      )}

      {state.status === "loading" && <State kind="loading" message="Reading the archive…" />}

      {state.status === "error" && <State kind="error" message={state.message} onRetry={retry} />}

      {state.status === "ready" && state.items.length === 0 && (
        <State
          kind="empty"
          message="No media in this archive."
          detail="If you expected photos or videos, import your export again from Import or replace archive."
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
                setDetailIndex(index);
              }}
              select={
                selecting
                  ? {
                      isSelected: (id) => selection?.ids.has(id) === true,
                      onToggle: toggleItem,
                      onSetMany: setMany,
                    }
                  : undefined
              }
            />
          ) : (
            <MediaGrid
              items={state.items}
              source={repository}
              onOpen={(index) => {
                openerRef.current = document.activeElement as HTMLElement | null;
                setDetailIndex(index);
              }}
              select={
                selecting
                  ? {
                      isSelected: (id) => selection?.ids.has(id) === true,
                      onToggle: toggleItem,
                    }
                  : undefined
              }
            />
          )}
        </>
      )}

      {state.status === "ready" &&
        detailIndex !== null &&
        state.items[detailIndex] !== undefined && (
          <MediaDetail
            item={state.items[detailIndex]}
            index={detailIndex}
            total={state.items.length}
            source={repository}
            onClose={closeDetail}
          />
        )}
      {selecting && selection !== null && (
        <SelectionBar
          barRef={barRef}
          count={selection.count}
          bytes={selection.bytes}
          total={orderedIds.length}
          onSelectAll={() =>
            setSelection((previous) =>
              previous === null ? previous : selectAll(previous, orderedIds),
            )
          }
          onDeselectAll={() =>
            setSelection((previous) => (previous === null ? previous : clear(previous)))
          }
          onCancel={exitSelection}
        />
      )}
    </div>
  );
}
