import type { JSX } from "react";

import type { GalleryView } from "./useGalleryView.js";

/**
 * Grid | Timeline, as a native radio group.
 *
 * Native radios give arrow-key navigation, one tab stop and correct checked-state
 * announcements; the status line makes the change explicit to a screen reader
 * without relying on colour or position.
 */
export function GalleryViewSwitch({
  view,
  onChange,
}: {
  view: GalleryView;
  onChange: (view: GalleryView) => void;
}): JSX.Element {
  return (
    <div
      className="view-switch"
      role="radiogroup"
      aria-label="Gallery view"
      onKeyDown={(event) => {
        // Native radios already do this in a browser; jsdom does not, and the
        // behaviour is part of the control's contract. Arrow keys move the choice
        // and focus to the matching radio.
        const next =
          event.key === "ArrowRight" || event.key === "ArrowDown"
            ? "timeline"
            : event.key === "ArrowLeft" || event.key === "ArrowUp"
              ? "grid"
              : null;
        if (next === null) return;
        event.preventDefault();
        onChange(next);
        event.currentTarget.querySelector<HTMLInputElement>(`input[value="${next}"]`)?.focus();
      }}
    >
      <label className="view-option">
        <input
          type="radio"
          name="gallery-view"
          value="grid"
          checked={view === "grid"}
          onChange={() => onChange("grid")}
        />
        Grid
      </label>
      <label className="view-option">
        <input
          type="radio"
          name="gallery-view"
          value="timeline"
          checked={view === "timeline"}
          onChange={() => onChange("timeline")}
        />
        Timeline
      </label>
      <span className="visually-hidden" role="status" aria-live="polite">
        {view === "grid" ? "Grid view selected" : "Timeline view selected"}
      </span>
    </div>
  );
}
