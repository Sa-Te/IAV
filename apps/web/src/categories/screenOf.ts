import {
  findCategory,
  PERSON_CATEGORY_IDS,
  toAiConversationsView,
  toAvatarItemsView,
  toDeviceEffectsView,
  toEventListView,
  toMediaItems,
  toNameListView,
  toPersonView,
  toSavedCollectionsView,
  toSavedPostsByFolder,
  toSettingsView,
  toTableView,
  toTagListView,
  type AiConversationsView as AiConversationsViewData,
  type AvatarItemsView as AvatarItemsViewData,
  type CategoryRecord,
  type DeviceEffectsView as DeviceEffectsViewData,
  type EventListView as EventListViewData,
  type MediaItemView,
  type NameListView as NameListViewData,
  type PersonListView as PersonListViewData,
  type SavedByFolderView,
  type SettingsView as SettingsViewData,
  type TableView,
  type TagListView as TagListViewData,
  type TreeView,
} from "@instavault/core";

/**
 * Which panel a category renders. Kept apart from `CategoryView` because the
 * reader/renderer below it is already the larger half; this module only answers
 * "what is this record?".
 */

/** Categories that have a purpose-built view inside the generic route. */
export const THREAD_CATEGORIES = new Set(["messages_inbox", "messages_requests"]);

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

/** T4's measured person rows (docs/T4-DESIGN.md §7); the core owns the list. */
const PERSON_IDS = new Set(PERSON_CATEGORY_IDS);

/** The three T2 name/place lists; a paginated name list, not the event list. */
const NAME_LIST_T2 = new Set([
  "advertisers_using_your_activity_or_information",
  "other_categories_used_to_reach_you",
  "locations_of_interest",
]);

export type Screen =
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
  | { readonly kind: "people"; readonly view: PersonListViewData }
  | { readonly kind: "tags"; readonly view: TagListViewData }
  | { readonly kind: "ai"; readonly view: AiConversationsViewData }
  | { readonly kind: "photos"; readonly media: readonly MediaItemView[] }
  | {
      readonly kind: "saved";
      readonly view: SavedByFolderView;
      readonly showLoose: boolean;
    }
  | { readonly kind: "table"; readonly view: TableView }
  | { readonly kind: "tree"; readonly view: TreeView };

/**
 * The screen is chosen by what the record contains, not by its name: within T1 the
 * measured label/value categories share the settings screen, and the two measured
 * outliers get their own (docs/T1-DESIGN.md §3, §5). A record that does not match
 * the expected shape falls back to the table or the raw tree.
 */
export function screenOf(
  id: string,
  record: CategoryRecord,
  sibling: CategoryRecord | null,
): Screen {
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

  // T4: the measured person rows share one card, and the hashtag list keeps a
  // tag list because a person card would be a lie about its contents (D4/T4 §7).
  if (PERSON_IDS.has(id)) {
    const people = toPersonView({
      id,
      data: record.data,
      ...(record.sources === undefined ? {} : { sources: record.sources }),
    });
    if (people !== null) return { kind: "people", view: people };
  }

  if (id === "following_hashtags") {
    const tags = toTagListView({
      id,
      data: record.data,
      ...(record.sources === undefined ? {} : { sources: record.sources }),
    });
    if (tags !== null) return { kind: "tags", view: tags };
  }

  // T5's three remaining shapes (docs/T5-DESIGN.md §8): the event list with
  // Author as the row's subject, the AI record with collapsed turns, and the
  // existing settings screen for the payment envelope.
  if (id === "threads_viewed") {
    const event = toEventListView(record);
    if (event !== null) return { kind: "event", view: event };
  }

  if (id === "ai_conversations") {
    const ai = toAiConversationsView({
      data: record.data,
      ...(record.sources === undefined ? {} : { sources: record.sources }),
    });
    if (ai !== null) return { kind: "ai", view: ai };
  }

  if (id === "checkout_payment_information") {
    const settings = toSettingsView(record);
    if (settings !== null) return { kind: "settings", view: settings };
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
