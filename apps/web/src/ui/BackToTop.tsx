import { useEffect, useState, type JSX } from "react";

/**
 * Appears once the page has been scrolled past a screenful.
 *
 * Passive listener, one boolean of React state, and a smooth scroll that becomes
 * instant under `prefers-reduced-motion` (AGENTS.md §8).
 */
const AFTER_PX = 600;

export function BackToTop(): JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setVisible(window.scrollY > AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="back-to-top"
      aria-label="Back to top"
      onClick={() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
