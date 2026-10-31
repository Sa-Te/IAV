import { useEffect, useRef, useState, type JSX, type ReactNode } from "react";

import { revealCopy } from "@instavault/core";

/**
 * The T5 reveal gate (ADR 0009, amendment "explicit reveal").
 *
 * Children are **not mounted** before the click, so their effects — including the
 * repository read — never run. Hiding rendered data with CSS would leave the read
 * in the network tab (well: in IndexedDB) and defeat the point.
 *
 * Reveal state is a module-level set: deliberate, in memory only, never persisted.
 * A reload re-gates. Within one page session a category stays revealed for that
 * category, including after a remount, because re-gating on every navigation is
 * noise for the person who already chose to look.
 */

const revealed = new Set<string>();

/** Test hook: the set is process-wide within a page, so tests must reset it. */
export function clearRevealedCategories(): void {
  revealed.clear();
}

export function isRevealed(categoryId: string): boolean {
  return revealed.has(categoryId);
}

export function RevealGate({
  categoryId,
  children,
}: {
  categoryId: string;
  children: ReactNode;
}): JSX.Element {
  const [shown, setShown] = useState(() => revealed.has(categoryId));
  const [focusOnMount, setFocusOnMount] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const copy = revealCopy(categoryId);

  // Focus follows the reveal, but only for the click that caused it: a remount of
  // an already-revealed category must not steal focus from the nav.
  useEffect(() => {
    if (focusOnMount) contentRef.current?.focus();
  }, [focusOnMount]);

  if (shown) {
    return (
      <div ref={contentRef} tabIndex={-1} role="group" aria-label={copy.title}>
        {children}
      </div>
    );
  }

  return (
    <section className="reveal-gate">
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      <button
        type="button"
        onClick={() => {
          revealed.add(categoryId);
          setShown(true);
          setFocusOnMount(true);
        }}
      >
        Show this category
      </button>
    </section>
  );
}
