import type { JSX, ReactNode } from "react";

/**
 * The four states, once.
 *
 * Before this, loading/empty/error were re-implemented per view and drifted: one
 * said "Reading…" with no live region, another used a red box for "not in this
 * export", which is not an error (ADR 0002). The *words* are still per-view — a
 * gallery and a thread list have different things to say — but the shape, the
 * tokens and the announcements are not.
 *
 * loading  — calm, one live region, no alarm.
 * empty    — informational: the archive is fine, there is simply nothing here.
 * error    — role="alert", the reason in words, and a retry button that works.
 * unavailable — greyed: "not in this export" is a normal state, not a failure.
 */

export type StateKind = "loading" | "empty" | "error" | "unavailable";

const HEADINGS: Readonly<Record<StateKind, string>> = {
  loading: "Loading",
  empty: "Nothing here",
  error: "Something went wrong",
  unavailable: "Not in this export",
};

const DEFAULT_COPY: Readonly<Record<StateKind, string>> = {
  loading: "Reading from this device…",
  empty: "There is nothing in this part of the archive.",
  error: "The data could not be read.",
  unavailable: "This category is not in this export.",
};

export function State({
  kind,
  message,
  detail,
  children,
  onRetry,
  retryLabel = "Try again",
}: {
  kind: StateKind;
  /** Required words; the default only exists so a caller cannot leave it blank. */
  message?: string;
  /** A second sentence: the reason, or what to do next. */
  detail?: string;
  children?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}): JSX.Element {
  const heading = HEADINGS[kind];
  const body = message ?? DEFAULT_COPY[kind];

  const live =
    kind === "error"
      ? { role: "alert" as const }
      : { role: "status" as const, "aria-live": "polite" as const };

  return (
    <div className={`state state-${kind}`} {...live}>
      <p className="state-heading">
        <span className="state-icon" aria-hidden="true" />
        {heading}
      </p>

      {kind === "loading" ? (
        // A calm skeleton, not a spinner: three quiet bars that pulse.
        <div className="state-skeleton" aria-hidden="true">
          <span className="state-skeleton-bar" />
          <span className="state-skeleton-bar state-skeleton-bar-short" />
        </div>
      ) : (
        <p className="state-body">{body}</p>
      )}

      {detail !== undefined && <p className="state-detail">{detail}</p>}
      {children}

      {onRetry !== undefined && (
        <p>
          <button type="button" className="button" onClick={onRetry}>
            {retryLabel}
          </button>
        </p>
      )}
    </div>
  );
}
