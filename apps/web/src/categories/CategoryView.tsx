import {
  findCategory,
  isT5,
  toSettingsView,
  toTableView,
  type CategoryRecord,
  type CategoryViewData,
  type SettingsView as SettingsViewData,
} from "@instavault/core";
import { useCallback, useEffect, useState, type JSX } from "react";
import { useParams } from "react-router-dom";

import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { ThreadList } from "../messages/ThreadList.js";
import { CategoryTable } from "./CategoryTable.js";
import { CategoryTree } from "./CategoryTree.js";
import { RevealGate } from "./RevealGate.js";
import { SettingsView } from "./SettingsView.js";
import { State } from "../ui/State.js";

/** Categories that have a purpose-built view inside the generic route. */
const THREAD_CATEGORIES = new Set(["messages_inbox", "messages_requests"]);

/**
 * `/categories/:id` — the generic view for any parsed category.
 *
 * The interpretation (what is a column, what is a tree) happened in core; this
 * component only decides which panel to show and what to say while it waits.
 * Media categories keep their own routes and are not duplicated here.
 *
 * A T5 category is wrapped in `RevealGate`, and the gate is outside the component
 * that reads the repository — so before the click there is no read at all, not a
 * read whose result is hidden (ADR 0009 amendment).
 */

type State =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "missing" }
  | {
      readonly status: "ready";
      readonly view: CategoryViewData;
      readonly record: CategoryRecord;
      readonly settings: SettingsViewData | null;
    };

/** The reader. It is only mounted once the gate (if any) has been opened. */
function CategoryData({ id }: { id: string }): JSX.Element {
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
        if (record === null) {
          setState({ status: "missing" });
          return;
        }
        // The screen is chosen by what the record contains, within T1: the ten
        // label/value categories share the settings screen (docs/T1-DESIGN.md).
        // A T1 record that is not label/value returns null and keeps its old view.
        const settings = findCategory(id)?.privacyTier === 1 ? toSettingsView(record) : null;
        setState({ status: "ready", view: toTableView(record), record, settings });
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
    <>
      {state.status === "loading" && <State kind="loading" message="Reading this category…" />}

      {state.status === "failed" && (
        <State
          kind="error"
          message="This category could not be read."
          detail={state.message}
          onRetry={retry}
        />
      )}

      {state.status === "missing" && (
        <State
          kind="unavailable"
          detail="That is normal — Instagram does not include every category in every export."
        />
      )}

      {state.status === "ready" && THREAD_CATEGORIES.has(id) && (
        <ThreadList record={state.record} />
      )}

      {state.status === "ready" && !THREAD_CATEGORIES.has(id) && state.settings !== null && (
        <SettingsView view={state.settings} raw={state.record.data} />
      )}

      {state.status === "ready" &&
        !THREAD_CATEGORIES.has(id) &&
        state.settings === null &&
        state.view.kind === "table" &&
        state.view.total === 0 && (
          <State kind="empty" message="This category is in this export but holds no entries." />
        )}

      {state.status === "ready" &&
        !THREAD_CATEGORIES.has(id) &&
        state.settings === null &&
        state.view.kind === "table" &&
        state.view.total > 0 && <CategoryTable view={state.view} caption={label} />}

      {state.status === "ready" &&
        !THREAD_CATEGORIES.has(id) &&
        state.settings === null &&
        state.view.kind === "tree" && <CategoryTree view={state.view} caption={label} />}
    </>
  );
}

export function CategoryView({ id }: { id: string }): JSX.Element {
  const label = findCategory(id)?.label ?? id;
  const content = <CategoryData id={id} />;

  return (
    <div className="gallery">
      <p>
        <a href="/categories">All categories</a>
      </p>
      <h1>{label}</h1>

      {isT5(id) ? <RevealGate categoryId={id}>{content}</RevealGate> : content}
    </div>
  );
}

/** The route wrapper: a static route element cannot read a path parameter. */
export function CategoryRoute(): JSX.Element {
  const { id } = useParams();
  return <CategoryView id={id ?? ""} />;
}
