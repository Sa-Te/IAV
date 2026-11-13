import { describe, expect, it } from "vitest";

import { toEventListView, type EventEntry } from "./eventListView.js";

/**
 * One real-shaped fixture per T3 event-list category (docs/T3-DESIGN.md §3), with
 * the hero and the date asserted by value. Synthetic values, measured shapes: the
 * label strings, key sets and envelope kinds are the ones the archive writes.
 *
 * The T3 comment categories are here too. Their gate is a render decision
 * (apps/web/src/categories/RevealGate.tsx); the parser is the same screen.
 */

const AT = 1_700_000_000;

interface Case {
  readonly id: string;
  readonly data: unknown;
  /** The hero text the row shows, or null for a plain field list. */
  readonly hero: string | null;
  readonly heroLabel?: string;
  readonly timestamp: number;
  readonly url?: string;
}

const CASES: readonly Case[] = [
  {
    // A single label/value envelope, not an array, with a bare `Emoji` label.
    id: "story_reaction_sticker_reactions",
    data: {
      fbid: "1",
      timestamp: AT,
      media: [],
      label_values: [
        { label: "Emoji", value: "🔥" },
        { title: "Owner", dict: [] },
      ],
    },
    hero: null,
    timestamp: AT,
  },
  {
    id: "reels_comments",
    data: {
      comments_reels_comments: [
        {
          string_map_data: {
            Comment: { value: "a reel comment" },
            "Media Owner": { value: "someone" },
            Time: { timestamp: AT + 1 },
          },
        },
      ],
    },
    hero: "a reel comment",
    heroLabel: "Comment",
    timestamp: AT + 1,
  },
  {
    id: "questions",
    data: [
      {
        fbid: "1",
        timestamp: AT + 2,
        media: [],
        label_values: [
          { label: "Question", value: "a question" },
          { label: "Answer", value: "an answer" },
          { label: "Update time", timestamp_value: AT },
          { title: "Media", dict: [] },
        ],
      },
    ],
    hero: "a question",
    heroLabel: "Question",
    timestamp: AT + 2,
  },
  {
    id: "emoji_sliders",
    data: [
      {
        fbid: "1",
        timestamp: AT + 3,
        media: [],
        label_values: [
          { label: "URL", href: "https://www.instagram.com/p/AAA111/", value: "" },
          { label: "Question", value: "a slider prompt" },
          { label: "Emoji", value: "😀" },
          { label: "Caption", value: "a visual reply caption" },
          { title: "Owner", dict: [] },
        ],
      },
    ],
    hero: "a visual reply caption",
    heroLabel: "Caption",
    timestamp: AT + 3,
    url: "https://www.instagram.com/p/AAA111/",
  },
  {
    id: "quizzes",
    data: [
      {
        fbid: "1",
        timestamp: AT + 4,
        media: [],
        label_values: [
          { label: "Question", value: "a quiz question" },
          { title: "Media", dict: [] },
        ],
      },
    ],
    hero: "a quiz question",
    heroLabel: "Question",
    timestamp: AT + 4,
  },
  {
    id: "story_likes",
    data: [
      {
        fbid: "1",
        timestamp: AT + 5,
        media: [],
        label_values: [
          { label: "URL", href: "https://www.instagram.com/p/BBB222/", value: "" },
          { label: "Caption", value: "a liked story" },
          { title: "Owner", dict: [] },
        ],
      },
    ],
    hero: "a liked story",
    heroLabel: "Caption",
    timestamp: AT + 5,
    url: "https://www.instagram.com/p/BBB222/",
  },
  {
    // No label layer: `title` is the account, `string_list_data` the date and link.
    id: "liked_comments",
    data: {
      likes_comment_likes: [
        {
          title: "someone",
          string_list_data: [
            {
              href: "https://www.instagram.com/p/CCC333/",
              value: "True",
              timestamp: AT + 6,
            },
          ],
        },
      ],
    },
    hero: "someone",
    heroLabel: "title",
    timestamp: AT + 6,
    url: "https://www.instagram.com/p/CCC333/",
  },
  {
    id: "saved_collections",
    data: [
      {
        fbid: "1",
        timestamp: AT + 7,
        media: [],
        label_values: [
          { label: "Name", value: "a collection" },
          { label: "Type", value: "saved" },
          { label: "Privacy", value: "private" },
          { label: "Update time", timestamp_value: AT },
        ],
      },
    ],
    hero: "a collection",
    heroLabel: "Name",
    timestamp: AT + 7,
  },
  {
    id: "post_comments",
    data: [
      {
        media_list_data: [{ uri: "" }],
        string_map_data: {
          Comment: { value: "a post comment" },
          "Media Owner": { value: "someone" },
          Time: { timestamp: AT + 8 },
        },
      },
    ],
    hero: "a post comment",
    heroLabel: "Comment",
    timestamp: AT + 8,
  },
  {
    id: "polls",
    data: [
      {
        fbid: "1",
        timestamp: AT + 9,
        media: [],
        label_values: [
          { label: "Question", value: "a poll question" },
          { label: "Option 1", value: "first" },
          { label: "Option 2", value: "second" },
          { label: "Expiry time", timestamp_value: 0 },
          { label: "URL", href: "https://www.instagram.com/p/DDD444/", value: "" },
        ],
      },
    ],
    hero: "a poll question",
    heroLabel: "Question",
    timestamp: AT + 9,
    url: "https://www.instagram.com/p/DDD444/",
  },
  {
    id: "saved_posts",
    data: [
      {
        fbid: "1",
        timestamp: AT + 10,
        media: [],
        label_values: [
          { label: "URL", href: "https://www.instagram.com/p/EEE555/", value: "" },
          { label: "Caption", value: "a saved post" },
          { label: "Title", value: "" },
          { title: "Owner", dict: [] },
        ],
      },
    ],
    hero: "a saved post",
    heroLabel: "Caption",
    timestamp: AT + 10,
    url: "https://www.instagram.com/p/EEE555/",
  },
  {
    id: "liked_posts",
    data: [
      {
        fbid: "1",
        timestamp: AT + 11,
        media: [],
        label_values: [
          { label: "URL", href: "https://www.instagram.com/p/FFF666/", value: "" },
          { label: "Caption", value: "a liked post" },
          { title: "Brand partner", dict: [] },
        ],
      },
    ],
    hero: "a liked post",
    heroLabel: "Caption",
    timestamp: AT + 11,
    url: "https://www.instagram.com/p/FFF666/",
  },
  {
    id: "instants_interactions",
    data: [
      {
        fbid: "1",
        timestamp: AT + 12,
        media: [],
        label_values: [
          { label: "Media", media: [] },
          { label: "URL", href: "https://www.instagram.com/p/GGG777/", value: "" },
          { label: "Emoji", value: "👋" },
          { title: "Metadata", dict: [] },
        ],
      },
    ],
    hero: null,
    timestamp: AT + 12,
    url: "https://www.instagram.com/p/GGG777/",
  },
  {
    // The posts envelope shape, as an activity list with no caption-like label.
    id: "other_content",
    data: [
      {
        fbid: "1",
        timestamp: AT + 13,
        media: [],
        label_values: [
          { label: "Media", media: [] },
          { label: "Published", value: "True" },
          { label: "Upload identifier", value: "" },
          { label: "Story type", value: "" },
        ],
      },
    ],
    hero: null,
    timestamp: AT + 13,
  },
];

function firstEntry(data: unknown): EventEntry {
  const view = toEventListView({ data });
  expect(view).not.toBeNull();
  if (view === null) throw new Error("not an event list");
  const month = view.months[0];
  const day = month?.days[0];
  const entry = day?.entries[0];
  if (entry === undefined) throw new Error("no entry");
  return entry;
}

describe("T3 event list — every measured category", () => {
  for (const testCase of CASES) {
    describe(testCase.id, () => {
      it("renders the measured hero and date", () => {
        const view = toEventListView({ data: testCase.data });
        expect(view).not.toBeNull();
        if (view === null) return;

        expect(view.total).toBe(1);
        expect(view.hasTimestamps).toBe(true);
        expect(view.months).toHaveLength(1);

        const entry = firstEntry(testCase.data);
        expect(entry.timestamp).toBe(testCase.timestamp);
        expect(entry.date).not.toBeNull();
        expect(entry.hero?.text ?? null).toBe(testCase.hero);
        expect(entry.hero?.label).toBe(testCase.heroLabel);
        expect(entry.url).toBe(testCase.url ?? null);
      });

      it("renders a present-but-empty category as empty, not broken", () => {
        const view = toEventListView({ data: [] });

        expect(view).not.toBeNull();
        expect(view?.total).toBe(0);
        expect(view?.hasTimestamps).toBe(false);
      });

      it("falls back instead of inventing a view for an unreadable record", () => {
        expect(toEventListView({ data: [{ foo: "bar" }] })).toBeNull();
      });
    });
  }
});
