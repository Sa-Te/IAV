import type { MediaItemView } from "@instavault/core";
import { useEffect, useState, type JSX } from "react";

import { MediaTile } from "./MediaTile.js";
import { Provenance } from "./Provenance.js";
import { onThumbnailsUnavailable, thumbnailsUnavailable } from "./thumbnailWorker.js";
import type { MediaSource } from "./useMediaUrl.js";

/**
 * One line, once per page session, when the thumbnail worker could not start.
 * Every tile keeps working from original blobs; this only explains the slower,
 * larger images.
 */
function ThumbnailNotice(): JSX.Element | null {
  const [unavailable, setUnavailable] = useState(thumbnailsUnavailable);

  useEffect(() => {
    setUnavailable(thumbnailsUnavailable());
    return onThumbnailsUnavailable(() => setUnavailable(true));
  }, []);

  return unavailable ? (
    <p className="summary" role="status">
      Thumbnail generation is unavailable, so original images are shown.
    </p>
  ) : null;
}

/** Present only in selection mode. Grid order is the gallery's order. */
export interface GridSelection {
  readonly isSelected: (id: string) => boolean;
  readonly onToggle: (id: string, shiftKey: boolean) => void;
}

/** Responsive grid. Fixed aspect ratio per tile so the layout never jumps. */
export function MediaGrid({
  items,
  source,
  onOpen,
  select,
}: {
  items: readonly MediaItemView[];
  source: MediaSource;
  onOpen: (index: number) => void;
  select?: GridSelection | undefined;
}): JSX.Element {
  return (
    <>
      <ThumbnailNotice />
      <ul className="grid">
        {items.map((item, index) => (
          <li key={`${item.category}:${item.id}:${index}`}>
            <MediaTile
              item={item}
              source={source}
              onOpen={() => onOpen(index)}
              select={
                select === undefined
                  ? undefined
                  : {
                      selected: select.isSelected(item.id),
                      onToggle: (shiftKey) => select.onToggle(item.id, shiftKey),
                    }
              }
            />
            <Provenance item={item} />
          </li>
        ))}
      </ul>
    </>
  );
}
