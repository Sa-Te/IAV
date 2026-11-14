// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryView } from "../categories/CategoryView.js";
import { clearRevealedCategories } from "../categories/RevealGate.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";

const THREAD: CategoryRecord = {
  id: "messages_inbox",
  resolvedTier: 1,
  entryCount: 1,
  data: {
    participants: [{ name: "alice" }],
    messages: [
      { sender_name: "alice", timestamp_ms: 1_700_000_000_000, content: "printed secret text" },
    ],
  },
  sources: [
    {
      path: "your_instagram_activity/messages/inbox/thread-1/message_1.json",
      entryCount: 1,
      kind: "object",
    },
  ],
  warnings: [],
};

function repository(): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [THREAD],
    getMediaBlob: async () => null,
    getCategory: async (id) => (id === "messages_inbox" ? THREAD : null),
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderView(): void {
  render(
    <RepositoryProvider repository={repository()}>
      <CategoryView id="messages_inbox" />
    </RepositoryProvider>,
  );
}

beforeEach(() => clearRevealedCategories());
afterEach(cleanup);

describe("printing a conversation", () => {
  it("has no print control and no message text before the reveal", () => {
    renderView();

    expect(screen.queryByRole("button", { name: "Print conversation" })).toBeNull();
    expect(document.body.textContent).not.toContain("printed secret text");
  });

  it("offers print only after the reveal and calls the browser's print", async () => {
    const user = userEvent.setup();
    const print = vi.fn();
    vi.stubGlobal("print", print);
    renderView();

    await user.click(screen.getByRole("button", { name: "Show this category" }));
    await user.click(await screen.findByRole("button", { name: /alice/ }));
    expect(await screen.findByText("printed secret text")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Print conversation" }));
    expect(print).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
