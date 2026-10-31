import { findCategory, toTableView, type CategoryViewData } from "@instavault/core";
import { useCallback, useEffect, useState, type JSX } from "react";
import { useParams } from "react-router-dom";

import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { CategoryTable } from "./CategoryTable.js";
import { CategoryTree } from "./CategoryTree.js";

/**
 * `/categories/:id` — the generic view for any parsed category.
 *
 * The interpretation (what is a column, what is a tree) happened in core; this
 * component only decides which panel to show and what to say while it waits.
 * Media categories keep their own routes and are not duplicated here.
 */

type State =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "missing" }
  | { readonly status: "ready"; readonly view: CategoryViewData };

export function CategoryView({ id }: { id: string }): JSX.Element {
  const repository = useArchiveRepository();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const label = findCategory(id)?.label ?? id;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    void (async () => {
      try {
        const record = await repository.getCategory(id);
        if (cancelled) return;
        setState(
          record === null ? { status: "missing" } : { status: "ready", view: toTableView(record) },
        );
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "failed",
            message: error instanceof Error ? error.message : "The category could not be read.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repository, id, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return (
    <main className="gallery">
      <p>
        <a href="/categories">All categories</a>
      </p>
      <h1>{label}</h1>

      {state.status === "loading" && <p role="status">Reading this category…</p>}

      {state.status === "failed" && (
        <div role="alert" className="state state-error">
          <p>This category could not be read: {state.message}</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {state.status === "missing" && (
        <div className="state state-empty">
          <p>This category is not in this export.</p>
          <p>That is normal — Instagram does not include every category in every export.</p>
        </div>
      )}

      {state.status === "ready" && state.view.kind === "table" && state.view.total === 0 && (
        <p className="state state-empty">This category is in this export but holds no entries.</p>
      )}

      {state.status === "ready" && state.view.kind === "table" && state.view.total > 0 && (
        <CategoryTable view={state.view} caption={label} />
      )}

      {state.status === "ready" && state.view.kind === "tree" && (
        <CategoryTree view={state.view} caption={label} />
      )}
    </main>
  );
}

/** The route wrapper: a static route element cannot read a path parameter. */
export function CategoryRoute(): JSX.Element {
  const { id } = useParams();
  return <CategoryView id={id ?? ""} />;
}
