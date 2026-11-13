// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryView } from "./CategoryView.js";
import { clearRevealedCategories } from "./RevealGate.js";

/**
 * The T3 wiring: every measured activity category reaches the event screen, the
 * four media categories do not (they keep their gallery routes, D4), and the
 * caps still apply through the route.
 *
 * Per-category heroes and dates are asserted in core
 * (`packages/core/src/categories/t3EventList.test.ts`); this file asserts routing,
 * the gate and the cap, which are the parts the route owns.
 */

const AT = 1_700_000_000;

const EVENT_T3 = [
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
] as const;

const GATED_T3 = ["post_comments", "liked_comments", "reels_comments"] as const;

const MEDIA_T3 = ["posts", "stories", "archived_posts", "profile_photos"] as const;

function row(count: number): unknown[] {
  return Array.from({ length: count }, (_, index) => ({
    fbid: String(index),
    timestamp: AT + index,
    media: [],
    label_values: [{ label: "Name", value: `row ${index + 1}` }],
  }));
}

function recordFor(id: string, data: unknown = row(1)): CategoryRecord {
  return {
    id,
    resolvedTier: 1,
    entryCount: Array.isArray(data) ? data.length : 1,
    data,
    sources: [{ path: `${id}.json`, entryCount: 1, kind: "array" }],
    warnings: [],
  };
}

function repositoryWith(records: readonly CategoryRecord[]): ArchiveRepository {
  const byId = new Map(records.map((record) => [record.id, record]));
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    getMediaBlob: async () => null,
    getCategory: async (id) => byId.get(id) ?? null,
    listCategories: async () => [...byId.values()],
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderView(records: readonly CategoryRecord[], id: string): void {
  render(
    <RepositoryProvider repository={repositoryWith(records)}>
      <CategoryView id={id} />
    </RepositoryProvider>,
  );
}

beforeEach(() => clearRevealedCategories());
afterEach(cleanup);

describe("T3 screens — routing", () => {
  for (const id of EVENT_T3) {
    it(`renders ${id} as an event list`, async () => {
      const user = userEvent.setup();
      renderView([recordFor(id)], id);

      // The three comment categories are gated (ADR 0014); the screen behind the
      // gate is the same one.
      if ((GATED_T3 as readonly string[]).includes(id)) {
        await user.click(screen.getByRole("button", { name: "Show this category" }));
      }

      await screen.findByText("1 entry");
      expect(document.querySelector(".event-view")).not.toBeNull();
    });
  }

  for (const id of MEDIA_T3) {
    it(`keeps ${id} off the event list`, async () => {
      renderView([recordFor(id)], id);

      await screen.findByRole("heading", { level: 1 });
      await vi.waitFor(() => expect(document.querySelector(".event-view")).toBeNull());
    });
  }
});

describe("T3 screens — the gate reaches the rows", () => {
  for (const id of GATED_T3) {
    it(`does not render ${id} rows before the reveal`, async () => {
      const user = userEvent.setup();
      const repository = repositoryWith([recordFor(id)]);

      render(
        <RepositoryProvider repository={repository}>
          <CategoryView id={id} />
        </RepositoryProvider>,
      );

      expect(screen.getByRole("button", { name: "Show this category" })).toBeDefined();
      expect(document.querySelector(".event-view")).toBeNull();
      expect(document.querySelectorAll(".event-row")).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "Show this category" }));

      await screen.findByText("1 entry");
      expect(document.querySelector(".event-view")).not.toBeNull();
    });
  }
});

describe("T3 screens — the caps survive the route", () => {
  it("shows 200 rows of a 250-row day and adds the rest on request", async () => {
    const user = userEvent.setup();
    // Every row on one day: liked_posts' measured case, scaled down.
    const sameDay = Array.from({ length: 250 }, (_, index) => ({
      fbid: String(index),
      timestamp: AT,
      media: [],
      label_values: [{ label: "Caption", value: `post ${index + 1}` }],
    }));

    renderView([recordFor("liked_posts", sameDay)], "liked_posts");

    await screen.findByText("250 entries");
    expect(document.querySelectorAll(".event-row")).toHaveLength(200);
    expect(screen.getByText("Showing 200 of 250 entries.")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Show 50 more" }));
    expect(document.querySelectorAll(".event-row")).toHaveLength(250);
  });
});
