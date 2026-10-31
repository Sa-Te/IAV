import { useEffect, useState } from "react";

/**
 * `prefers-reduced-motion` as a value, for the parts CSS cannot cover.
 *
 * CSS handles the shimmer and the transitions. This exists for behaviour: the
 * detail view's pointer-idle fade is a timer, and a user who asked for reduced
 * motion should never have controls disappear on them. A future 3D view uses the
 * same hook to choose its static fallback.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window.matchMedia === "function" ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(QUERY);
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
