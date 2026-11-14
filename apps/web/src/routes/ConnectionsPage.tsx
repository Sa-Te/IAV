import { diffConnections, toPersonList, type ConnectionDiff } from "@instavault/core";
import { useEffect, useMemo, useState, type JSX } from "react";

import { PersonListView } from "../people/PersonListView.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { State } from "../ui/State.js";

/**
 * `/connections` — followers ∩ following by username (D4).
 *
 * Ungated: these are the reader's own public relationships (ADR 0019). The three
 * groups and the unmatched records all render with the existing person list, so
 * pagination and the year fold are the same as T4.
 */

type State =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "ready"; readonly diff: ConnectionDiff };

function Group({
  title,
  people,
}: {
  title: string;
  people: ConnectionDiff["mutual"];
}): JSX.Element {
  return (
    <section className="connections-group">
      <h2 className="connections-heading">
        {title}
        <span className="connections-count">{people.length}</span>
      </h2>
      {people.length === 0 ? (
        <p className="summary">No one in this group.</p>
      ) : (
        <PersonListView view={toPersonList(people)} />
      )}
    </section>
  );
}

export function ConnectionsPage(): JSX.Element {
  const repository = useArchiveRepository();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void (async () => {
      try {
        const [followers, following] = await Promise.all([
          repository.getCategory("followers"),
          repository.getCategory("following"),
        ]);
        if (cancelled) return;
        setState({
          status: "ready",
          diff: diffConnections({ data: followers?.data ?? [] }, { data: following?.data ?? [] }),
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "failed",
            message: error instanceof Error ? error.message : "The connections could not be read.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, attempt]);

  const lists = useMemo(() => {
    if (state.status !== "ready") return null;
    return {
      mutual: toPersonList(state.diff.mutual),
      followOnly: toPersonList(state.diff.followOnly),
      followerOnly: toPersonList(state.diff.followerOnly),
      unmatched: toPersonList(state.diff.unmatched),
    };
  }, [state]);

  return (
    <div className="gallery connections-page">
      <h1>Followers and following</h1>

      {state.status === "loading" && <State kind="loading" message="Reading the connections…" />}
      {state.status === "failed" && (
        <State
          kind="error"
          message="The connections could not be read."
          detail={state.message}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      )}

      {state.status === "ready" && lists !== null && (
        <>
          <p className="connections-summary">
            {state.diff.followerTotal} followers · {state.diff.followingTotal} following ·{" "}
            {state.diff.followOnly.length} you follow who do not follow you
          </p>

          <Group title="Mutual" people={state.diff.mutual} />
          <Group title="You follow only" people={state.diff.followOnly} />
          <Group title="Follows you only" people={state.diff.followerOnly} />

          {state.diff.unmatched.length > 0 && (
            <section className="connections-group">
              <h2 className="connections-heading">
                No username in the export
                <span className="connections-count">{state.diff.unmatched.length}</span>
              </h2>
              <p className="summary">
                These entries have no usable username, so they are kept here and counted in none of
                the three totals above.
              </p>
              <PersonListView view={lists.unmatched} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
