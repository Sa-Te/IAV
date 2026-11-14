import type { JSX, Ref } from "react";

import { formatBytes } from "./format.js";

/**
 * The selection action bar. Sticky at the bottom of the content area, so it is
 * reachable without scrolling back past a long grid, and it replaces the
 * Grid | Timeline switch while selection mode is on: you are browsing or
 * selecting, never both by accident.
 *
 * `role="toolbar"` with a label; the count is a polite live region so every
 * toggle is announced without stealing focus.
 */
export function SelectionBar({
  count,
  bytes,
  total,
  onSelectAll,
  onDeselectAll,
  onCancel,
  barRef,
}: {
  count: number;
  bytes: number;
  /** Every item in the view, not the rendered page (D4). */
  total: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancel: () => void;
  barRef?: Ref<HTMLDivElement>;
}): JSX.Element {
  const allSelected = total > 0 && count === total;
  return (
    <div
      ref={barRef}
      className="selection-bar"
      role="toolbar"
      aria-label="Selection actions"
      tabIndex={-1}
    >
      <p className="selection-count" role="status" aria-live="polite">
        {count} selected · {formatBytes(bytes)}
      </p>
      <div className="selection-actions">
        <button
          type="button"
          className="button button-quiet"
          onClick={onSelectAll}
          disabled={allSelected}
        >
          Select all {total}
        </button>
        <button
          type="button"
          className="button button-quiet"
          onClick={onDeselectAll}
          disabled={count === 0}
        >
          Deselect all {total}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
