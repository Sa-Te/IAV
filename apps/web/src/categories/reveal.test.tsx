// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryView } from "./CategoryView.js";
import { clearRevealedCategories } from "./RevealGate.js";

beforeEach(() => clearRevealedCategories());
afterEach(cleanup);

function recordFor(id: string): CategoryRecord {
  return {
    id,
    resolvedTier: 1,
    entryCount: 1,
    data: [{ content: "synthetic", timestamp_ms: 1 }],
    sources: [{ path: `${id}/thread/message_1.json`, entryCount: 1, kind: "object" }],
    warnings: [],
  };
}

function repositoryWith(
  ids: readonly string[],
): ArchiveRepository & { getCategory: ReturnType<typeof vi.fn> } {
  const records = new Map(ids.map((id) => [id, recordFor(id)]));
  const getCategory = vi.fn(async (id: string) => records.get(id) ?? null);
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    getMediaBlob: async () => null,
    getCategory,
    listCategories: async () => [...records.values()],
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

function renderView(repository: ArchiveRepository, id: string): void {
  render(
    <RepositoryProvider repository={repository}>
      <CategoryView id={id} />
    </RepositoryProvider>,
  );
}

describe("T5 reveal gate", () => {
  it("does not read the category before the click", async () => {
    const user = userEvent.setup();
    const repository = repositoryWith(["messages_inbox"]);
    renderView(repository, "messages_inbox");

    // The copy is on screen; the data read has not happened at all.
    expect(screen.getByRole("button", { name: "Show this category" })).toBeDefined();
    expect(repository.getCategory).toHaveBeenCalledTimes(0);

    await user.click(screen.getByRole("button", { name: "Show this category" }));

    expect(repository.getCategory).toHaveBeenCalledWith("messages_inbox");
    expect(repository.getCategory.mock.calls[0]?.[0]).toBe("messages_inbox");
  });

  it("gates once per category per page session, including across remounts", async () => {
    const user = userEvent.setup();
    const repository = repositoryWith(["messages_inbox"]);
    const first = render(
      <RepositoryProvider repository={repository}>
        <CategoryView id="messages_inbox" />
      </RepositoryProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Show this category" }));
    first.unmount();

    // Remount: no second click, because the module-level set still holds it.
    renderView(repository, "messages_inbox");

    expect(screen.queryByRole("button", { name: "Show this category" })).toBeNull();
    expect(
      repository.getCategory.mock.calls.filter(([id]) => id === "messages_inbox"),
    ).toHaveLength(2);
  });

  it("moves focus into the revealed content", async () => {
    const user = userEvent.setup();
    renderView(repositoryWith(["messages_inbox"]), "messages_inbox");
    await user.click(screen.getByRole("button", { name: "Show this category" }));

    expect(document.activeElement?.getAttribute("role")).toBe("group");
  });

  it("uses category-specific copy and never mixes two categories' words", () => {
    renderView(
      repositoryWith(["messages_inbox", "messages_requests", "checkout_payment_information"]),
      "messages_inbox",
    );
    const messages = document.body.textContent ?? "";
    expect(messages).toContain("conversations other people had with you");
    expect(messages).not.toContain("payment");
    cleanup();

    clearRevealedCategories();
    renderView(repositoryWith(["checkout_payment_information"]), "checkout_payment_information");
    const payment = document.body.textContent ?? "";
    expect(payment).toContain("payment and address records");
    expect(payment).not.toContain("conversations other people had with you");
  });

  it("uses the neutral fallback for a T5 category we have no copy for, and still gates", () => {
    renderView(repositoryWith(["unrecognised"]), "unrecognised");

    expect(screen.getByText("Third-party authored text")).toBeDefined();
    expect(screen.getByRole("button", { name: "Show this category" })).toBeDefined();
  });

  it("leaves T1–T4 categories without third-party text ungated", () => {
    for (const id of ["posts", "saved_posts", "liked_posts"]) {
      renderView(repositoryWith([id]), id);
      expect(screen.queryByRole("button", { name: "Show this category" })).toBeNull();
      cleanup();
    }
  });

  it("gates a T3 comment category without moving it out of T3", async () => {
    const user = userEvent.setup();
    const repository = repositoryWith(["post_comments"]);
    renderView(repository, "post_comments");

    // A T3 category: the gate does not become a tier change.
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Comments");
    expect(screen.getByRole("button", { name: "Show this category" })).toBeDefined();
    expect(repository.getCategory).toHaveBeenCalledTimes(0);
    expect(document.body.textContent).toContain("words other people wrote");

    await user.click(screen.getByRole("button", { name: "Show this category" }));

    expect(repository.getCategory).toHaveBeenCalledTimes(1);
    expect(repository.getCategory).toHaveBeenCalledWith("post_comments");
  });

  it("renders exactly one gate for a comment category and one for a T5 category", () => {
    for (const id of ["post_comments", "messages_inbox"]) {
      renderView(repositoryWith([id]), id);
      expect(screen.getAllByRole("button", { name: "Show this category" })).toHaveLength(1);
      cleanup();
    }
  });

  it("does not gate the other T3 lists", () => {
    for (const id of ["saved_collections", "story_likes", "other_content"]) {
      renderView(repositoryWith([id]), id);
      expect(screen.queryByRole("button", { name: "Show this category" })).toBeNull();
      cleanup();
    }
  });

  it("gates synced contacts without reading the address book first (D2)", async () => {
    const user = userEvent.setup();
    const repository = repositoryWith(["synced_contacts"]);
    renderView(repository, "synced_contacts");

    expect(repository.getCategory).toHaveBeenCalledTimes(0);
    expect(document.body.textContent).toContain("address book");
    expect(document.body.textContent).toContain("phone numbers and email addresses");
    expect(screen.getByRole("button", { name: "Show this category" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Show this category" }));

    expect(repository.getCategory).toHaveBeenCalledTimes(1);
    expect(repository.getCategory).toHaveBeenCalledWith("synced_contacts");
  });

  it("does not gate the other T4 rows, including followers and following", () => {
    for (const id of ["following", "followers", "blocked_profiles", "pending_follow_requests"]) {
      renderView(repositoryWith([id]), id);
      expect(screen.queryByRole("button", { name: "Show this category" })).toBeNull();
      cleanup();
    }
  });
});
