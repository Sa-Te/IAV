import { useCallback, useState } from "react";

/**
 * The gallery's view choice, persisted as a UI setting (AGENTS §1.3: localStorage
 * is for UI settings and nothing else). Grid is the default; an unknown stored
 * value falls back to Grid rather than throwing.
 */

export type GalleryView = "grid" | "timeline";

export const GALLERY_VIEW_KEY = "instavault-gallery-view";

function storedView(): GalleryView {
  try {
    return localStorage.getItem(GALLERY_VIEW_KEY) === "timeline" ? "timeline" : "grid";
  } catch {
    return "grid";
  }
}

export function useGalleryView(): readonly [GalleryView, (view: GalleryView) => void] {
  const [view, setView] = useState<GalleryView>(storedView);

  const choose = useCallback((next: GalleryView) => {
    setView(next);
    try {
      localStorage.setItem(GALLERY_VIEW_KEY, next);
    } catch {
      /* a blocked store still lets the choice apply for this page */
    }
  }, []);

  return [view, choose] as const;
}
