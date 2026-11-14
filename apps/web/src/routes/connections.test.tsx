// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { ConnectionsPage } from "./ConnectionsPage.js";

const AT = 1_700_000_000;

function follower(username: string): Record<string, unknown> {
  return {
    title: "",
    media_list_data: [],
    string_list_data: [
      { href: `https://www.instagram.com/${username}`, value: username, timestamp: AT },
    ],
  };
}

function following(username: string): Record<string, unknown> {
  return {
    title: username,
    string_list_data: [{ href: `https://www.instagram.com/_u/${username}`, timestamp: AT }],
  };
}

const FOLLOWERS: CategoryRecord = {
  id: "followers",
  resolvedTier: 1,
  entryCount: 3,
  data: [follower("alice"), follower("carol"), { title: "", string_list_data: [{}] }],
  warnings: [],
};

const FOLLOWING: CategoryRecord = {
  id: "following",
  resolvedTier: 1,
  entryCount: 2,
  data: { relationships_following: [following("alice"), following("bob")] },
  warnings: [],
};

function repository(): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [FOLLOWERS, FOLLOWING],
    getMediaBlob: async () => null,
    getCategory: async (id) =>
      id === "followers" ? FOLLOWERS : id === "following" ? FOLLOWING : null,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

afterEach(cleanup);

describe("connections page", () => {
  it("states the three totals and shows the three groups", async () => {
    render(
      <RepositoryProvider repository={repository()}>
        <ConnectionsPage />
      </RepositoryProvider>,
    );

    expect(
      await screen.findByText("3 followers · 2 following · 1 you follow who do not follow you"),
    ).toBeDefined();

    expect(screen.getByRole("heading", { name: /Mutual/ }).textContent).toContain("1");
    expect(screen.getByRole("heading", { name: /You follow only/ }).textContent).toContain("1");
    expect(screen.getByRole("heading", { name: /Follows you only/ }).textContent).toContain("1");
    expect(screen.getByText("alice")).toBeDefined();
    expect(screen.getByText("bob")).toBeDefined();
    expect(screen.getByText("carol")).toBeDefined();
  });

  it("keeps an entry with no username in its own group and out of the three totals", async () => {
    render(
      <RepositoryProvider repository={repository()}>
        <ConnectionsPage />
      </RepositoryProvider>,
    );

    await screen.findByText("3 followers · 2 following · 1 you follow who do not follow you");
    expect(
      screen.getByRole("heading", { name: /No username in the export/ }).textContent,
    ).toContain("1");
    expect(screen.getByText(/counted in none of the three totals/)).toBeDefined();
  });

  it("shows the empty state when both lists are empty", async () => {
    const empty: ArchiveRepository = {
      ...repository(),
      getCategory: async () => ({ ...FOLLOWERS, data: [] }),
    };
    render(
      <RepositoryProvider repository={empty}>
        <ConnectionsPage />
      </RepositoryProvider>,
    );

    expect(
      await screen.findByText("0 followers · 0 following · 0 you follow who do not follow you"),
    ).toBeDefined();
    expect(screen.getAllByText("No one in this group.")).toHaveLength(3);
  });
});
