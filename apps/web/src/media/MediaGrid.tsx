import type { MediaItemView } from "@instavault/core";
import type { JSX } from "react";

import { MediaTile } from "./MediaTile.js";
import type { MediaSource } from "./useMediaUrl.js";

/** Responsive grid. Fixed aspect ratio per tile so the layout never jumps. */
export function MediaGrid({
  items,
  source,
  onOpen,
}: {
  items: readonly MediaItemView[];
  source: MediaSource;
  onOpen: (index: number) => void;
}): JSX.Element {
  return (
    <ul className="grid">
      {items.map((item, index) => (
        <li key={`${item.category}:${item.id}:${index}`}>
          <MediaTile item={item} source={source} onOpen={() => onOpen(index)} />
        </li>
      ))}
    </ul>
  );
}
