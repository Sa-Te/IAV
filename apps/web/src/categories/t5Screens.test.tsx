// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryView } from "./CategoryView.js";
import { clearRevealedCategories } from "./RevealGate.js";

const AT = 1_700_000_000;

function aiRecord(): CategoryRecord {
  return {
    id: "ai_conversations",
    resolvedTier: 1,
    entryCount: 1,
    data: [
      {
        title: "A conversation",
        timestamp: AT,
        media: [],
        fbid: "1",
        label_values: [
          { label: "Summary", value: "A short summary" },
          {
            title: "Conversation",
            dict: [
              {
                title: "",
                dict: [
                  { label: "Message", value: "first turn" },
                  { label: "Name", value: "User" },
                  { timestamp_value: AT + 1 },
                ],
              },
            ],
          },
        ],
      },
    ],
    sources: [{ path: "ai_conversations.json", entryCount: 1, kind: "array" }],
    warnings: [],
  };
}

function checkoutRecord(): CategoryRecord {
  return {
    id: "checkout_payment_information",
    resolvedTier: 1,
    entryCount: 1,
    data: {
      timestamp: AT,
      media: [],
      fbid: "1",
      label_values: [
        { label: "Region", value: "somewhere" },
        { label: "Name", value: "Ada Lovelace" },
      ],
    },
    sources: [{ path: "checkout_payment_information.json", entryCount: 1, kind: "object" }],
    warnings: [],
  };
}

function threadsViewedRecord(): CategoryRecord {
  return {
    id: "threads_viewed",
    resolvedTier: 1,
    entryCount: 1,
    data: {
      text_post_app_text_post_app_posts_seen: [
        {
          string_map_data: {
            Author: { value: "alex" },
            Time: { timestamp: AT },
            URL: { href: "https://www.threads.com/@alex/post/1" },
          },
        },
      ],
    },
    sources: [{ path: "threads_viewed.json", entryCount: 1, kind: "object" }],
    warnings: [],
  };
}

function repository(record: CategoryRecord): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [record],
    getMediaBlob: async () => null,
    getCategory: async (id) => (id === record.id ? record : null),
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderView(record: CategoryRecord): void {
  render(
    <RepositoryProvider repository={repository(record)}>
      <CategoryView id={record.id} />
    </RepositoryProvider>,
  );
}

beforeEach(() => clearRevealedCategories());
afterEach(cleanup);

describe("T5's last three screens", () => {
  it("renders ai_conversations as a labelled record with a collapsed transcript", async () => {
    const user = userEvent.setup();
    renderView(aiRecord());
    await user.click(screen.getByRole("button", { name: "Show this category" }));

    expect(await screen.findByText("A conversation")).toBeDefined();
    expect(screen.getByText("1 conversation")).toBeDefined();
    expect(screen.getByText("A short summary")).toBeDefined();

    const details = document.querySelector<HTMLDetailsElement>("details.ai-transcript");
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(screen.getByText("Transcript · 1 turn")).toBeDefined();
    expect(screen.getByText("first turn")).toBeDefined();
    expect(screen.getByText("User")).toBeDefined();
  });

  it("renders checkout_payment_information on the settings screen", async () => {
    const user = userEvent.setup();
    renderView(checkoutRecord());
    await user.click(screen.getByRole("button", { name: "Show this category" }));

    expect(await screen.findByText("Region")).toBeDefined();
    expect(document.querySelector(".settings-view")).not.toBeNull();
    expect(document.querySelector(".category-table")).toBeNull();
  });

  it("renders threads_viewed on the event list with Author as the hero", async () => {
    const user = userEvent.setup();
    renderView(threadsViewedRecord());
    await user.click(screen.getByRole("button", { name: "Show this category" }));

    expect(await screen.findByText("alex")).toBeDefined();
    expect(document.querySelector(".event-view")).not.toBeNull();
    expect(screen.getByRole("link", { name: /threads.com/ })).toBeDefined();
  });
});
