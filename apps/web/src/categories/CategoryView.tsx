import {
  findCategory,
  isGated,
  toAvatarItemsView,
  toDeviceEffectsView,
  toEventListView,
  toMediaItems,
  toNameListView,
  toSavedCollectionsView,
  toSavedPostsByFolder,
  toSettingsView,
  toTableView,
  type AvatarItemsView as AvatarItemsViewData,
  type CategoryRecord,
  type DeviceEffectsView as DeviceEffectsViewData,
  type EventListView as EventListViewData,
  type MediaItemView,
  type NameListView as NameListViewData,
  type SavedByFolderView,
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
import { EventListView } from "./EventListView.js";
import { NameListView } from "./NameListView.js";
import { ProfilePhotosView } from "./ProfilePhotosView.js";
import { ProfileView } from "./ProfileView.js";
import { SavedFoldersView } from "./SavedFoldersView.js";
import { RevealGate } from "./RevealGate.js";
import { SettingsView } from "./SettingsView.js";
import { State } from "../ui/State.js";

/** Categories that have a purpose-built view inside the generic route. */
const THREAD_CATEGORIES = new Set(["messages_inbox", "messages_requests"]);

/**
 * The T2 categories the measurement assigned to the event/activity screen
 * (docs/T2-DESIGN.md §6). Scoped by id because only these were measured; a
 * record that does not match the shape falls back to the table or tree.
 */
const EVENT_CATEGORIES = new Set([
  "link_history",
  "login_activity",
  "logout_activity",
  "posts_viewed",
  "posts_you're_interested_or_not_interested_in",
  "posts_you're_not_interested_in",
  "profile_activity",
  "profile_changes",
  "profile_privacy_changes",
  "profile_searches",
  "profile_status_changes",
  "stories_viewed",
  "suggested_profiles_viewed",
  "videos_watched",
  "word_or_phrase_searches",
  "your_ownership_of_digital_items",
]);

/**
 * The T3 categories the measurement assigned to the event/activity screen
 * (docs/T3-DESIGN.md §6): eleven activity lists plus the three comment lists, which
 * use the same screen and are gated by the registry flag (ADR 0014). The four
 * media categories keep their gallery routes and are deliberately absent (D4).
 */
const EVENT_T3 = new Set([
  "story_reaction_sticker_reactions",
  "reels_comments",
  "questions",
  "emoji_sliders",
  "quizzes",
  "story_likes",
  "liked_comments",
  "saved_collections",
  "post_comments",
  "polls",
  "saved_posts",
  "liked_posts",
  "instants_interactions",
  "other_content",
]);

/** T2 categories the measurement assigned to the existing settings screen. */
const SETTINGS_T2 = new Set([
  "signup_details",
  "subscription_for_no_ads",
  "last_known_location",
  "profile_based_in",
]);

/** The one T2 category with a real local media item (the profile photo). */
const PROFILE_T2 = new Set(["personal_information"]);

/** The three T2 name/place lists; a paginated name list, not the event list. */
const NAME_LIST_T2 = new Set([
  "advertisers_using_your_activity_or_information",
  "other_categories_used_to_reach_you",
  "locations_of_interest",
]);

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
  | { readonly kind: "event"; readonly view: EventListViewData }
  | {
      readonly kind: "profile";
      readonly view: SettingsViewData;
      readonly media: readonly MediaItemView[];
    }
  | { readonly kind: "name-list"; readonly view: NameListViewData }
  | { readonly kind: "photos"; readonly media: readonly MediaItemView[] }
  | {
      readonly kind: "saved";
      readonly view: SavedByFolderView;
      readonly showLoose: boolean;
    }
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
function screenOf(id: string, record: CategoryRecord, sibling: CategoryRecord | null): Screen {
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

  if (findCategory(id)?.privacyTier === 2 && EVENT_CATEGORIES.has(id)) {
    const event = toEventListView(record);
    if (event !== null) return { kind: "event", view: event };
  }

  if (findCategory(id)?.privacyTier === 3 && EVENT_T3.has(id)) {
    // Saved posts and collections are one idea: the membership is nested in the
    // collection file, so the screen joins the two records by URL. When the other
    // half is absent the event list is still the right shape for saved_posts.
    if (id === "saved_collections") {
      const collections = toSavedCollectionsView(record);
      const joined =
        collections === null
          ? null
          : sibling === null
            ? collections
            : toSavedPostsByFolder(sibling, collections);
      if (joined !== null) return { kind: "saved", view: joined, showLoose: false };
    }
    if (id === "saved_posts" && sibling !== null) {
      const collections = toSavedCollectionsView(sibling);
      const grouped = toSavedPostsByFolder(record, collections);
      if (grouped !== null && grouped.folders.length > 0) {
        return { kind: "saved", view: grouped, showLoose: true };
      }
    }

    const event = toEventListView(record);
    if (event !== null) return { kind: "event", view: event };
  }

  if (id === "profile_photos") {
    return { kind: "photos", media: toMediaItems(id, record.data) };
  }

  if (findCategory(id)?.privacyTier === 2 && PROFILE_T2.has(id)) {
    const settings = toSettingsView(record);
    if (settings !== null) {
      return { kind: "profile", view: settings, media: toMediaItems(id, record.data) };
    }
  }

  if (findCategory(id)?.privacyTier === 2 && NAME_LIST_T2.has(id)) {
    const names = toNameListView(record);
    if (names !== null) return { kind: "name-list", view: names };
  }

  if (findCategory(id)?.privacyTier === 2 && SETTINGS_T2.has(id)) {
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
