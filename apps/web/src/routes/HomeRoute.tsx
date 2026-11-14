import { useEffect, useState, type JSX } from "react";
import { Navigate } from "react-router-dom";

import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { State } from "../ui/State.js";
import { CategoryGallery } from "./CategoryGallery.js";

/**
 * `/` after the front door exists.
 *
 * The archive row decides: no archive goes to `/import`, an archive goes to the
 * gallery. Until the answer is known the page shows a loading state — never the
 * gallery followed by a jump. This is a cold gate, not a list cache: it reads one
 * row, once.
 */

type State =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "present" };

export function HomeRoute(): JSX.Element {
  const repository = useArchiveRepository();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void repository
      .summary()
      .then((row) => {
        if (!cancelled) setState({ status: row === null ? "empty" : "present" });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "failed",
            message: error instanceof Error ? error.message : "The archive could not be checked.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repository, attempt]);

  if (state.status === "loading") {
    return <State kind="loading" detail="Checking this device…" />;
  }
  if (state.status === "failed") {
    return (
      <State
        kind="error"
        message="The archive could not be checked."
        detail={state.message}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    );
  }
  if (state.status === "empty") {
    return <Navigate to="/import" replace />;
  }
  return <CategoryGallery category="all" title="Everything" />;
}
