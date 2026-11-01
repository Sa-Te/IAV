// @vitest-environment jsdom
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { AppShell } from "./AppShell.js";

afterEach(cleanup);

const repository: ArchiveRepository = {
  listMedia: async () => ({ items: [], nextCursor: null }),
  listCategories: async () => [],
  getMediaBlob: async () => null,
  getCategory: async () => null,
  summary: async () => null,
  getThumbnail: async () => null,
  putThumbnail: async () => undefined,
  auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
};

function renderShell(): void {
  render(
    <MemoryRouter>
      <RepositoryProvider repository={repository}>
        <AppShell>
          <h1>A page</h1>
        </AppShell>
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

describe("application shell", () => {
  it("puts the skip link before everything else in the document", () => {
    renderShell();
    const skip = screen.getByRole("link", { name: "Skip to content" });
    const firstLink = screen.getAllByRole("link")[0];

    expect(firstLink).toBe(skip);
    expect(skip.getAttribute("href")).toBe("#main");
  });

  it("has one main landmark and exactly one h1", () => {
    renderShell();

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("states truthfully that nothing leaves the device", () => {
    renderShell();

    expect(screen.getByRole("contentinfo").textContent).toContain("Nothing is uploaded");
  });

  it("offers the three theme choices as a radio group", () => {
    renderShell();
    const group = screen.getByRole("group", { name: "Theme" });

    expect(group).toBeDefined();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });
});
