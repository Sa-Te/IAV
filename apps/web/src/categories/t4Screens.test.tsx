// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryView } from "./CategoryView.js";
import { clearRevealedCategories } from "./RevealGate.js";

/**
 * T4 wiring: every measured person row reaches the person screen, the hashtag row
 * keeps a tag list, and neither falls through to the generic table or tree. The
 * field mapping is asserted in core (`personView.test.ts`); this file asserts the
 * route's screen choice.
 */

const AT = Date.UTC(2024, 4, 1, 12) / 1000;

const PERSON_T4 = [
  "removed_suggestions",
  "restricted_profiles",
  "hide_story_from",
  "close_friends",
  "recent_follow_requests",
  "follow_requests_you've_received",
  "threads_follow_requests_received",
  "recently_unfollowed_profiles",
  "blocked_profiles",
  "pending_follow_requests",
  "followers",
  "following",
] as const;

function dataFor(id: string): unknown {
  if (id === "followers") {
    return [
      {
        title: "",
        media_list_data: [],
        string_list_data: [{ href: "https://www.instagram.com/ada", value: "ada", timestamp: AT }],
      },
    ];
  }
  if (id === "following") {
    return {
      relationships_following: [
        {
          title: "ada",
          string_list_data: [{ href: "https://www.instagram.com/_u/ada", timestamp: AT }],
        },
      ],
    };
  }
  if (id === "threads_follow_requests_received") {
    return {
      text_post_app_text_post_app_follow_requests_received: [
        {
          string_list_data: [{ href: "https://www.threads.com/ada", value: "ada", timestamp: AT }],
        },
      ],
    };
  }
  return [
    {
      fbid: "1",
      timestamp: AT,
      media: [],
      label_values: [
        { label: "URL", value: "" },
        { label: "Name", value: "Ada Lovelace" },
        { label: "Username", value: "ada" },
      ],
    },
  ];
}

function recordFor(id: string, data: unknown = dataFor(id)): CategoryRecord {
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

describe("T4 screens — routing", () => {
  for (const id of PERSON_T4) {
    it(`renders ${id} on the person screen`, async () => {
      renderView([recordFor(id)], id);

      await screen.findByText("1 person");
      expect(document.querySelector(".people-view")).not.toBeNull();
      expect(document.querySelectorAll(".person-card")).toHaveLength(1);
      expect(document.querySelector(".category-table")).toBeNull();
    });
  }

  it("renders following_hashtags as a tag list, never as people", async () => {
    const record = {
      ...recordFor("following_hashtags", {
        relationships_following_hashtags: [
          {
            title: "",
            media_list_data: [],
            string_list_data: [
              { href: "https://www.instagram.com/topic", value: "topic", timestamp: AT },
            ],
          },
        ],
      }),
      sources: [{ path: "following_hashtags.json", entryCount: 1, kind: "object" as const }],
    };
    renderView([record], "following_hashtags");

    await screen.findByText("1 hashtag");
    expect(document.querySelector(".tag-view")).not.toBeNull();
    expect(document.querySelector(".person-card")).toBeNull();
    expect(screen.getByRole("link", { name: "https://www.instagram.com/topic" }).textContent).toBe(
      "#topic",
    );
  });
});
