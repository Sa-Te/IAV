import {
  findCategory,
  isT5,
  toAvatarItemsView,
  toDeviceEffectsView,
  toSettingsView,
  toTableView,
  type AvatarItemsView as AvatarItemsViewData,
  type CategoryRecord,
  type DeviceEffectsView as DeviceEffectsViewData,
  type SettingsView as SettingsViewData,
  type TableView,
  type TreeView,
} from "@instavault/core";
import { useCallback, useEffect, useState, type JSX } from "react";
import { useParams } from "react-router-dom";

import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { ThreadList } from "../messages/ThreadList.js";
import { AvatarItemsView } from "./AvatarItemsView.js";
import { CategoryTable } from "./CategoryTable.js";
import { CategoryTree } from "./CategoryTree.js";
import { DeviceEffectsView } from "./DeviceEffectsView.js";
import { RevealGate } from "./RevealGate.js";
import { SettingsView } from "./SettingsView.js";
import { State } from "../ui/State.js";

/** Categories that have a purpose-built view inside the generic route. */
const THREAD_CATEGORIES = new Set(["messages_inbox", "messages_requests"]);

/**
 * `/categories/:id` — the generic view for any parsed category.
 *
 * The interpretation (what is a column, what is a tree, what is a setting) happened
 * in core; this component only decides which panel to show and what to say while
 * it waits. Media categories keep their own routes and are not duplicated here.
 *
 * A T5 category is wrapped in `RevealGate`, and the gate is outside the component
 * that reads the repository — so before the click there is no read at all, not a
 * read whose result is hidden (ADR 0009 amendment).
 */

type Screen =
  | { readonly kind: "settings"; readonly view: SettingsViewData }
  | { readonly kind: "avatar"; readonly view: AvatarItemsViewData }
  | { readonly kind: "device"; readonly view: DeviceEffectsViewData }
  | { readonly kind: "table"; readonly view: TableView }
  | { readonly kind: "tree"; readonly view: TreeView };

type State =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "missing" }
  | { readonly status: "ready"; readonly record: CategoryRecord; readonly screen: Screen };

/**
 * The screen is chosen by what the record contains, not by its name: within T1 the
 * measured label/value categories share the settings screen, and the two measured
 * outliers get their own (docs/T1-DESIGN.md §3, §5). A record that does not match
 * the expected shape falls back to the table or the raw tree.
 */
function screenOf(id: string, record: CategoryRecord): Screen {
  if (findCategory(id)?.privacyTier === 1) {
    if (id === "avatar_items") {
      const avatar = toAvatarItemsView(record);
      if (avatar !== null) return { kind: "avatar", view: avatar };
    }
    if (id === "device_camera_effects_support") {
      const device = toDeviceEffectsView(record);
      if (device !== null) return { kind: "device", view: device };
    }
    const settings = toSettingsView(record);
    if (settings !== null) return { kind: "settings", view: settings };
  }

  const view = toTableView(record);
  return view.kind === "table" ? { kind: "table", view } : { kind: "tree", view };
}

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
        setState({ status: "ready", record, screen: screenOf(id, record) });
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

      {state.status === "ready" && !THREAD_CATEGORIES.has(id) && state.screen.kind === "avatar" && (
        <AvatarItemsView view={state.screen.view} raw={state.record.data} />
      )}

      {state.status === "ready" && !THREAD_CATEGORIES.has(id) && state.screen.kind === "device" && (
        <DeviceEffectsView view={state.screen.view} raw={state.record.data} />
      )}

      {state.status === "ready" &&
        !THREAD_CATEGORIES.has(id) &&
        state.screen.kind === "settings" && (
          <SettingsView view={state.screen.view} raw={state.record.data} />
        )}

      {state.status === "ready" &&
        !THREAD_CATEGORIES.has(id) &&
        state.screen.kind === "table" &&
        state.screen.view.total === 0 && (
          <State kind="empty" message="This category is in this export but holds no entries." />
        )}

      {state.status === "ready" &&
        !THREAD_CATEGORIES.has(id) &&
        state.screen.kind === "table" &&
        state.screen.view.total > 0 && <CategoryTable view={state.screen.view} caption={label} />}

      {state.status === "ready" && !THREAD_CATEGORIES.has(id) && state.screen.kind === "tree" && (
        <CategoryTree view={state.screen.view} caption={label} />
      )}
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
