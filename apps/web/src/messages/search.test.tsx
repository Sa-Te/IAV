// @vitest-environment jsdom
import type * as Core from "@instavault/core";
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@instavault/core", async (importOriginal) => {
  const actual = await importOriginal<typeof Core>();
  return { ...actual, buildIndex: vi.fn(actual.buildIndex) };
});

import { buildIndex } from "@instavault/core";

import { CategoryView } from "../categories/CategoryView.js";
import { clearRevealedCategories } from "../categories/RevealGate.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";

const INBOX: CategoryRecord = {
  id: "messages_inbox",
  resolvedTier: 1,
  entryCount: 2,
  data: {
    participants: [{ name: "alice" }, { name: "you" }],
    title: "alice",
    messages: [
      { sender_name: "alice", timestamp_ms: 2_000, content: "the later message" },
      { sender_name: "you", timestamp_ms: 1_000, content: "an earlier message" },
    ],
  },
  sources: [
    {
      path: "your_instagram_activity/messages/inbox/alice/message_1.json",
      entryCount: 2,
      kind: "object",
    },
  ],
  warnings: [],
};

function repository(
  record: CategoryRecord,
  getCategory = vi.fn(async () => record),
): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [record],
    getMediaBlob: async () => null,
    getCategory,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderView(source: ArchiveRepository): void {
  render(
    <RepositoryProvider repository={source}>
      <CategoryView id="messages_inbox" />
    </RepositoryProvider>,
  );
}

beforeEach(() => {
  clearRevealedCategories();
  vi.mocked(buildIndex).mockClear();
});

afterEach(cleanup);

describe("message search behind the gate", () => {
  it("builds no index and reads no category before the reveal", () => {
    const getCategory = vi.fn(async () => INBOX);
    renderView(repository(INBOX, getCategory));

    expect(getCategory).toHaveBeenCalledTimes(0);
    expect(buildIndex).toHaveBeenCalledTimes(0);
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("searches only after the reveal and filters to matching conversations", async () => {
    const user = userEvent.setup();
    renderView(repository(INBOX));

    await user.click(screen.getByRole("button", { name: "Show this category" }));
    const search = await screen.findByRole("searchbox");
    expect(buildIndex).toHaveBeenCalledTimes(1);

    await user.type(search, "later");

    expect(await screen.findByText(/1 matching message in 1 conversation/)).toBeDefined();
    expect(document.querySelector(".search-snippet")?.textContent).toContain("the later message");
    expect(screen.queryByText(/an earlier message/)).toBeNull();
    expect(screen.getByRole("button", { name: "Jump to message" })).toBeDefined();
  });

  it("jumps to the matched message and clears back to the list", async () => {
    const user = userEvent.setup();
    renderView(repository(INBOX));

    await user.click(screen.getByRole("button", { name: "Show this category" }));
    await user.type(await screen.findByRole("searchbox"), "later");
    await user.click(screen.getByRole("button", { name: "Jump to message" }));

    expect(await screen.findByText(/read-only copy of the export/)).toBeDefined();
    expect(document.activeElement?.id).toBe("message-1");

    await user.click(screen.getByRole("button", { name: "Back to conversations" }));
    expect(await screen.findByRole("searchbox")).toBeDefined();
    expect(document.querySelector(".search-snippet")?.textContent).toContain("the later message");
  });

  it("shows an empty result, not an error, and restoring the query restores the list", async () => {
    const user = userEvent.setup();
    renderView(repository(INBOX));

    await user.click(screen.getByRole("button", { name: "Show this category" }));
    const search = await screen.findByRole("searchbox");

    await user.type(search, "zzzzzz");
    expect(await screen.findByText("No messages match this search.")).toBeDefined();

    await user.clear(search);
    expect(await screen.findByText("1 conversation, newest first")).toBeDefined();
  });

  it("gates the search again after a fresh mount", async () => {
    const user = userEvent.setup();
    renderView(repository(INBOX));
    await user.click(screen.getByRole("button", { name: "Show this category" }));
    await screen.findByRole("searchbox");
    cleanup();

    clearRevealedCategories();
    renderView(repository(INBOX));
    expect(screen.getByRole("button", { name: "Show this category" })).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
