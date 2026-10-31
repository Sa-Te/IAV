import { useEffect, useState, type RefObject } from "react";

/** Tiles start loading a little before they scroll in, not after. */
export const VIEWPORT_MARGIN = "200px";

/**
 * True once the element has been near the viewport.
 *
 * Once true it stays true: a tile that scrolled away and back must not restart its
 * request, and the cache is what makes re-showing it instant.
 */
export function useInViewport(
  ref: RefObject<Element | null>,
  rootMargin: string = VIEWPORT_MARGIN,
): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (element === null || seen) return;

    // No IntersectionObserver (very old browser, or a Node test): load eagerly
    // rather than never.
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, seen]);

  return seen;
}
