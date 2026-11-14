// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryView } from "../categories/CategoryView.js";
import { clearRevealedCategories } from "../categories/RevealGate.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { ThreadList } from "./ThreadList.js";

beforeEach(() => clearRevealedCategories());
afterEach(cleanup);

const INBOX: CategoryRecord = {
  id: "messages_inbox",
  resolvedTier: 1,
  entryCount: 3,
  data: [
    {
      participants: [{ name: "alice" }, { name: "you" }],
      title: "alice",
      messages: [
        { sender_name: "alice", timestamp_ms: 2_000, content: "later" },
        { sender_name: "you", timestamp_ms: 1_000, content: "earlier" },
      ],
    },
    { participants: [{ name: "nobody" }], messages: [] },
  ],
  sources: [
    {
      path: "your_instagram_activity/messages/inbox/alice/message_1.json",
      entryCount: 2,
      kind: "object",
    },
    {
      path: "your_instagram_activity/messages/inbox/quiet/message_1.json",
      entryCount: 0,
      kind: "object",
    },
  ],
  warnings: [],
};

const REQUESTS: CategoryRecord = {
  id: "messages_requests",
  resolvedTier: 1,
  entryCount: 1,
  data: {
    participants: [{ name: "carol" }],
    messages: [{ sender_name: "carol", timestamp_ms: 5_000, content: "hello?" }],
  },
  sources: [
    {
      path: "your_instagram_activity/messages/message_requests/carol/message_1.json",
      entryCount: 1,
      kind: "object",
    },
  ],
  warnings: [],
};

function repository(records: readonly CategoryRecord[]): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => records,
    getMediaBlob: async () => null,
    getCategory: async (id) => records.find((record) => record.id === id) ?? null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

describe("threads inside the reveal gate", () => {
  it("shows nothing and reads nothing until the T5 gate is opened", async () => {
    const user = userEvent.setup();
    const getCategory = vi.fn(async (id: string) => (id === "messages_inbox" ? INBOX : null));
    render(
      <RepositoryProvider repository={{ ...repository([INBOX]), getCategory }}>
        <CategoryView id="messages_inbox" />
      </RepositoryProvider>,
    );

    expect(getCategory).toHaveBeenCalledTimes(0);
    expect(screen.queryByText(/conversations, newest first/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Show this category" }));

    expect(getCategory).toHaveBeenCalledWith("messages_inbox");
    expect(getCategory.mock.calls[0]?.[0]).toBe("messages_inbox");
    expect(await screen.findByText(/conversations, newest first/)).toBeDefined();
  });

  it("renders both message categories through their own gate", async () => {
    const user = userEvent.setup();
    for (const [record, expected] of [
      [INBOX, "alice, you"],
      [REQUESTS, "carol"],
    ] as const) {
      clearRevealedCategories();
      render(
        <RepositoryProvider repository={repository([record])}>
          <CategoryView id={record.id} />
        </RepositoryProvider>,
      );
      await user.click(screen.getByRole("button", { name: "Show this category" }));
      expect(await screen.findByText(expected)).toBeDefined();
      cleanup();
    }
  });

  it("marks a thread with no messages instead of hiding it", async () => {
    const user = userEvent.setup();
    render(
      <RepositoryProvider repository={repository([INBOX])}>
        <CategoryView id="messages_inbox" />
      </RepositoryProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Show this category" }));

    expect(await screen.findByText("empty — no messages")).toBeDefined();
    expect(screen.queryByText("quiet")).toBeNull();
    expect(screen.getByText("nobody")).toBeDefined();
  });

  it("says so when a thread recorded no participants", () => {
    render(
      <RepositoryProvider repository={repository([INBOX])}>
        <ThreadList
          record={{
            ...INBOX,
            data: [{ messages: [] }],
            sources: [
              {
                path: "your_instagram_activity/messages/inbox/quiet/message_1.json",
                entryCount: 0,
                kind: "object",
              },
            ],
          }}
        />
      </RepositoryProvider>,
    );

    expect(screen.getByText("No participants recorded")).toBeDefined();
  });

  it("opens a conversation in chronological order with an honest read-only note", async () => {
    const user = userEvent.setup();
    render(
      <RepositoryProvider repository={repository([INBOX])}>
        <CategoryView id="messages_inbox" />
      </RepositoryProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Show this category" }));
    await user.click(await screen.findByRole("button", { name: /alice, you/ }));

    const notes = screen.getAllByRole("note");
    expect(notes.map((note) => note.textContent).join(" ")).toContain(
      "read-only copy of the export",
    );
    const items = screen.getAllByRole("listitem");
    const texts = within(items[0]?.parentElement ?? document.body)
      .getAllByText(/earlier|later/)
      .map((element) => element.textContent);
    expect(texts).toEqual(["earlier", "later"]);
  });
});
