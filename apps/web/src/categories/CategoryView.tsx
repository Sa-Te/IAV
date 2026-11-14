import { findCategory, isGated, type CategoryRecord } from "@instavault/core";
import { useCallback, useEffect, useState, type JSX } from "react";
import { useParams } from "react-router-dom";

import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { ThreadList } from "../messages/ThreadList.js";
import { PersonListView } from "../people/PersonListView.js";
import { TagListView } from "../people/TagListView.js";
import { AvatarItemsView } from "./AvatarItemsView.js";
import { CategoryTable } from "./CategoryTable.js";
import { CategoryTree } from "./CategoryTree.js";
import { DeviceEffectsView } from "./DeviceEffectsView.js";
import { EventListView } from "./EventListView.js";
import { NameListView } from "./NameListView.js";
import { ProfilePhotosView } from "./ProfilePhotosView.js";
import { ProfileView } from "./ProfileView.js";
import { RevealGate } from "./RevealGate.js";
import { SavedFoldersView } from "./SavedFoldersView.js";
import { screenOf, THREAD_CATEGORIES, type Screen } from "./screenOf.js";
import { SettingsView } from "./SettingsView.js";
import { State } from "../ui/State.js";

/**
 * `/categories/:id` — the generic view for any parsed category.
 *
 * The interpretation (what is a column, what is a tree, what is a setting) happened
 * in core; `screenOf` chooses the panel and this component only renders it. Media
 * categories keep their own routes and are not duplicated here.
 *
 * A T5 category is wrapped in `RevealGate`, and the gate is outside the component
 * that reads the repository — so before the click there is no read at all, not a
 * read whose result is hidden (ADR 0009 amendment).
 */

type State =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "missing" }
  | { readonly status: "ready"; readonly record: CategoryRecord; readonly screen: Screen };

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
        // Saved posts and collections are two halves of one screen (see screenOf).
        // A missing or unreadable sibling is a normal state, not a failure: the
        // record in hand still renders.
        const siblingId =
          id === "saved_posts"
            ? "saved_collections"
            : id === "saved_collections"
              ? "saved_posts"
              : null;
        const sibling =
          siblingId === null ? null : await repository.getCategory(siblingId).catch(() => null);
        if (cancelled) return;
        setState({ status: "ready", record, screen: screenOf(id, record, sibling) });
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

      {state.status === "ready" && !THREAD_CATEGORIES.has(id) && state.screen.kind === "event" && (
        <EventListView view={state.screen.view} raw={state.record.data} />
      )}

      {state.status === "ready" &&
        !THREAD_CATEGORIES.has(id) &&
        state.screen.kind === "profile" && (
          <ProfileView
            view={state.screen.view}
            media={state.screen.media}
            source={repository}
            raw={state.record.data}
          />
        )}

      {state.status === "ready" &&
        !THREAD_CATEGORIES.has(id) &&
        state.screen.kind === "name-list" && (
          <NameListView view={state.screen.view} raw={state.record.data} />
        )}

      {state.status === "ready" && !THREAD_CATEGORIES.has(id) && state.screen.kind === "people" && (
        <PersonListView view={state.screen.view} raw={state.record.data} />
      )}

      {state.status === "ready" && !THREAD_CATEGORIES.has(id) && state.screen.kind === "tags" && (
        <TagListView view={state.screen.view} raw={state.record.data} />
      )}

      {state.status === "ready" && !THREAD_CATEGORIES.has(id) && state.screen.kind === "photos" && (
        <ProfilePhotosView media={state.screen.media} source={repository} raw={state.record.data} />
      )}

      {state.status === "ready" && !THREAD_CATEGORIES.has(id) && state.screen.kind === "saved" && (
        <SavedFoldersView
          view={state.screen.view}
          showLoose={state.screen.showLoose}
          raw={state.record.data}
        />
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

      {isGated(id) ? <RevealGate categoryId={id}>{content}</RevealGate> : content}
    </div>
  );
}

/** The route wrapper: a static route element cannot read a path parameter. */
export function CategoryRoute(): JSX.Element {
  const { id } = useParams();
  return <CategoryView id={id ?? ""} />;
}
