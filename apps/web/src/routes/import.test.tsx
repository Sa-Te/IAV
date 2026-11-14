// @vitest-environment jsdom
import type { ArchiveRow, CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImportPage } from "../import/ImportPage.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { buildRoutes } from "./routes.js";
import { HomeRoute } from "./HomeRoute.js";

const ARCHIVE: ArchiveRow = {
  id: "current",
  fingerprint: "fmt-test1",
  importedAt: "2026-11-14T00:00:00.000Z",
  sourceBytes: 10,
  counts: {
    categories: 5,
    entries: 20,
    mediaStored: 10,
    mediaMissing: 0,
    mediaOrphans: 0,
    unrecognised: 0,
  },
  drift: null,
  job: { status: "idle" },
};

function repository(summary: () => Promise<ArchiveRow | null>): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [] as CategoryRecord[],
    getMediaBlob: async () => null,
    getCategory: async () => null,
    summary,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("first run", () => {
  it("shows a loading state, then redirects to /import when there is no archive", async () => {
    let resolve: (row: ArchiveRow | null) => void = () => undefined;
    const pending = new Promise<ArchiveRow | null>((done) => {
      resolve = done;
    });
    render(
      <RepositoryProvider repository={repository(() => pending)}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/import" element={<p>Import page</p>} />
          </Routes>
        </MemoryRouter>
      </RepositoryProvider>,
    );

    expect(screen.getByText("Checking this device…")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Everything" })).toBeNull();

    resolve(null);
    expect(await screen.findByText("Import page")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Everything" })).toBeNull();
  });

  it("renders the gallery when an archive exists", async () => {
    render(
      <RepositoryProvider repository={repository(async () => ARCHIVE)}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/import" element={<p>Import page</p>} />
          </Routes>
        </MemoryRouter>
      </RepositoryProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Everything" })).toBeDefined();
    expect(screen.queryByText("Import page")).toBeNull();
  });
});

describe("/import", () => {
  it("is in the production route list and dev routes are not", () => {
    const production = buildRoutes(false).map((route) => route.path);
    expect(production).toContain("/import");
    expect(production).not.toContain("/dev/ingest");
  });

  it("shows the file control, the JSON instructions and the replace counts", async () => {
    vi.stubGlobal(
      "Worker",
      class {
        onmessage: ((event: MessageEvent) => void) | null = null;
        postMessage(): void {}
        terminate(): void {}
      },
    );

    render(
      <RepositoryProvider repository={repository(async () => ARCHIVE)}>
        <ImportPage />
      </RepositoryProvider>,
    );

    expect(
      await screen.findByText(/5 categories and 10 media files will be deleted/),
    ).toBeDefined();
    expect(screen.getByLabelText(/Drop your ZIP here/)).toBeDefined();
    expect(screen.getByText(/JSON is required/)).toBeDefined();
    expect(screen.getByText(/Nothing is uploaded, nothing is fetched/)).toBeDefined();
  });
});
