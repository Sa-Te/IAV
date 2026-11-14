// @vitest-environment jsdom
import type { ThreadMessage } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { ThreadConversation } from "./ThreadConversation.js";

const DAY = 24 * 60 * 60 * 1000;
const AT = Date.UTC(2024, 4, 1, 12);

function message(sender: string, timestampMs: number, text: string): ThreadMessage {
  return { sender, timestampMs, text, attachments: [] };
}

function repository(): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [],
    getMediaBlob: async () => null,
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderConversation(messages: readonly ThreadMessage[], ownerSender: string | null): void {
  render(
    <RepositoryProvider repository={repository()}>
      <ThreadConversation
        threadId="inbox/thread"
        summary={undefined}
        messages={messages}
        ownerSender={ownerSender}
        onBack={() => undefined}
      />
    </RepositoryProvider>,
  );
}

afterEach(cleanup);

describe("conversation bubbles", () => {
  const messages = [message("owner", AT, "from the owner"), message("alice", AT + 1, "from alice")];

  it("aligns the owner right and another participant left", () => {
    renderConversation(messages, "owner");

    expect(document.querySelector(".bubble-owner")).not.toBeNull();
    expect(document.querySelector(".bubble-other")).not.toBeNull();
    expect(document.querySelector(".bubble-group.is-owner")).not.toBeNull();
    expect(document.querySelector(".bubble-group.is-other")).not.toBeNull();
  });

  it("puts the sender in every message's accessible content", () => {
    renderConversation(messages, "owner");

    expect(screen.getByText(/owner:/)).toBeDefined();
    expect(screen.getByText(/alice:/)).toBeDefined();
  });

  it("groups consecutive messages under one sender label and one date", () => {
    renderConversation([message("owner", AT, "one"), message("owner", AT + 1, "two")], "owner");

    expect(screen.getAllByText("owner")).toHaveLength(1);
    expect(document.querySelectorAll(".bubble-date")).toHaveLength(1);
  });

  it("inserts a date when the day changes", () => {
    renderConversation([message("owner", AT, "one"), message("owner", AT + DAY, "two")], "owner");

    expect(document.querySelectorAll(".bubble-date")).toHaveLength(2);
  });

  it("falls back to a labelled list with an explanation when the owner is unknown", () => {
    renderConversation(messages, null);

    expect(document.querySelector(".bubbles")).toBeNull();
    expect(document.querySelector(".bubble")).toBeNull();
    expect(document.querySelector(".messages")).not.toBeNull();
    expect(screen.getByText(/does not say which participant is the account holder/)).toBeDefined();
  });
});
