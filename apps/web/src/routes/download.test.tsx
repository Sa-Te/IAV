// @vitest-environment jsdom
import type { CategoryRecord } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { CategoryGallery } from "./CategoryGallery.js";

const MB = 1024 * 1024;

const POSTS: CategoryRecord = {
  id: "posts",
  resolvedTier: 1,
  entryCount: 3,
  data: [
    {
      media: [
        { uri: "media/posts/a.jpg", title: "a", creation_timestamp: 1683000000 },
        { uri: "media/posts/b.jpg", title: "b", creation_timestamp: 1683100000 },
        { uri: "media/posts/no-blob.jpg", title: "no blob", creation_timestamp: 1683200000 },
      ],
    },
  ],
  warnings: [],
};

const SIZES: Readonly<Record<string, number>> = {
  "media/posts/a.jpg": 10 * MB,
  "media/posts/b.jpg": 20 * MB,
};

const BLOBS: Readonly<Record<string, string>> = {
  "media/posts/a.jpg": "first",
  "media/posts/b.jpg": "second",
};

function repository(
  sizes: Readonly<Record<string, number>> = SIZES,
  blobs: Readonly<Record<string, string>> = BLOBS,
): ArchiveRepository {
  const record = (id: string, bytes: number) => ({ id, path: id, bytes, mime: "image/jpeg" });
  return {
    listMedia: async () => ({
      items: Object.entries(sizes).map(([id, bytes]) => record(id, bytes)),
      nextCursor: null,
    }),
    listCategories: async () => [POSTS],
    getMediaBlob: async (id: string) =>
      blobs[id] === undefined ? null : new Blob([blobs[id] ?? ""], { type: "image/jpeg" }),
    getCategory: async () => POSTS,
    summary: async () => null,
    getThumbnail: async () => null,
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 1, media: 2, thumbs: 0 }),
  };
}

function renderGallery(source: ArchiveRepository = repository()): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/posts"]}>
      <RepositoryProvider repository={source}>
        <CategoryGallery category="posts" title="Posts" />
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

async function selectAll(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await screen.findByText("3 items");
  const select = screen.getByRole("button", { name: "Select" });
  await waitFor(() => expect((select as HTMLButtonElement).disabled).toBe(false));
  await user.click(select);
  await user.click(screen.getByRole("button", { name: "Select all 3" }));
}

async function openPanel(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(screen.getByRole("button", { name: "Download" }));
  return screen.getByRole("region", { name: /^Download / });
}

let clicked: string[] = [];

beforeEach(() => {
  localStorage.clear();
  clicked = [];
  URL.createObjectURL = vi.fn(() => "blob:zip");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this.download);
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("download a selection", () => {
  it("disables Download until something is selected", async () => {
    const user = userEvent.setup();
    renderGallery();
    await screen.findByText("3 items");
    await user.click(screen.getByRole("button", { name: "Select" }));

    const download = screen.getByRole("button", { name: "Download" });
    expect((download as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole("button", { name: "a" }));
    expect((download as HTMLButtonElement).disabled).toBe(false);
  });

  it("states the skipped files and the totals before the download starts", async () => {
    const user = userEvent.setup();
    renderGallery();
    await selectAll(user);

    const panel = await openPanel(user);

    expect(panel.textContent).toContain("Download 2 files");
    expect(panel.textContent).toContain("30 MB");
    expect(panel.textContent).toContain("1 selected item is left out: 1 with no stored file");
    expect(clicked).toEqual([]);
  });

  it("builds the ZIP, saves it, revokes the URL and clears the selection", async () => {
    const user = userEvent.setup();
    renderGallery();
    await selectAll(user);
    const panel = await openPanel(user);

    await user.click(within(panel).getByRole("button", { name: "Download ZIP" }));

    await waitFor(() =>
      expect(screen.queryByRole("toolbar", { name: "Selection actions" })).toBeNull(),
    );
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:zip");
    expect(clicked).toHaveLength(1);
    expect(clicked[0]).toMatch(/^instavault-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(screen.getByRole("button", { name: "Select" })).toBeDefined();
  });

  it("keeps the selection and shows the reason when a blob disappears", async () => {
    const user = userEvent.setup();
    // The store says b.jpg is there; by the time the ZIP is built it is not.
    renderGallery(repository(SIZES, { "media/posts/a.jpg": "first" }));
    await selectAll(user);
    const panel = await openPanel(user);

    await user.click(within(panel).getByRole("button", { name: "Download ZIP" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("media/posts/b.jpg");
    expect(alert.textContent).toContain("Your selection is still here");
    expect(screen.getByRole("toolbar").textContent).toContain("3 selected");
    expect(clicked).toEqual([]);
  });

  it("shows determinate progress while the ZIP is being built", async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const gated: ArchiveRepository = {
      ...repository(),
      getMediaBlob: async (id: string) => {
        await gate;
        return id === "media/posts/no-blob.jpg" ? null : new Blob([id]);
      },
    };
    renderGallery(gated);
    await selectAll(user);
    const panel = await openPanel(user);

    await user.click(within(panel).getByRole("button", { name: "Download ZIP" }));

    expect(await screen.findByText("Adding 0 of 2 files")).toBeDefined();
    expect(panel.querySelector("progress")?.getAttribute("max")).toBe("2");

    release();
    await waitFor(() => expect(screen.queryByRole("region", { name: /^Download / })).toBeNull());
    expect(screen.getByRole("button", { name: "Select" })).toBeDefined();
  });

  it("downloads a single selection as its own file, not a ZIP", async () => {
    const user = userEvent.setup();
    renderGallery();
    await screen.findByText("3 items");
    const select = screen.getByRole("button", { name: "Select" });
    await waitFor(() => expect((select as HTMLButtonElement).disabled).toBe(false));
    await user.click(select);
    await user.click(screen.getByRole("button", { name: "a" }));

    await user.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => expect(clicked).toHaveLength(1));
    expect(clicked[0]).toBe("a.jpg");
    expect(screen.queryByRole("region", { name: /^Download / })).toBeNull();
    await waitFor(() =>
      expect(screen.queryByRole("toolbar", { name: "Selection actions" })).toBeNull(),
    );
  });

  it("downloads the original, at its own name and format, from the detail view", async () => {
    const user = userEvent.setup();
    renderGallery();
    await screen.findByText("3 items");

    await user.click(screen.getByRole("button", { name: "a" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Original quality");

    await user.click(within(dialog).getByRole("button", { name: "Download original" }));

    await waitFor(() => expect(clicked).toHaveLength(1));
    expect(clicked[0]).toBe("a.jpg");
  });

  it("keeps the detail open and says why when the original is missing", async () => {
    const user = userEvent.setup();
    renderGallery(repository(SIZES, {}));
    await screen.findByText("3 items");

    await user.click(screen.getByRole("button", { name: /^a/ }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Download original" }));

    expect(await within(dialog).findByText(/no longer stored/)).toBeDefined();
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(clicked).toEqual([]);
  });

  it("warns about memory above 300 MB without blocking the download", async () => {
    const user = userEvent.setup();
    renderGallery(
      repository(
        { "media/posts/a.jpg": 400 * MB, "media/posts/b.jpg": 10 * MB },
        { "media/posts/a.jpg": "big", "media/posts/b.jpg": "small" },
      ),
    );
    await selectAll(user);
    const panel = await openPanel(user);

    expect(panel.textContent).toContain("built in memory");
    expect(
      (within(panel).getByRole("button", { name: "Download ZIP" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("names the iOS caveat before the download", async () => {
    const user = userEvent.setup();
    const ua = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
    });
    try {
      renderGallery();
      await selectAll(user);
      const panel = await openPanel(user);

      expect(panel.textContent).toContain("iOS Safari may not save a ZIP");
    } finally {
      if (ua !== undefined) Object.defineProperty(Navigator.prototype, "userAgent", ua);
    }
  });
});
