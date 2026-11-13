import { useEffect, useState } from "react";

/**
 * One media query as state. `matchMedia` is the only way to know which layout the
 * browser is actually using — CSS breakpoints are invisible to the ARIA the
 * sidebar needs (a dialog when it is a sheet, a landmark when it is not).
 */
export function useMediaQuery(query: string): boolean {
  const query_ = (): MediaQueryList | null =>
    typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
  const [matches, setMatches] = useState(() => query_()?.matches ?? false);

  useEffect(() => {
    const list = query_();
    if (list === null) return;
    const onChange = () => setMatches(list.matches);
    setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
