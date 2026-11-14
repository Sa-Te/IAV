// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadOriginal, fileNameOf, type OriginalSource } from "./singleFile.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const BLOB = new Blob(["original bytes"], { type: "image/jpeg" });

function source(blob: Blob | null = BLOB): OriginalSource {
  return { getMediaBlob: async () => blob };
}

function saveSpy(): ReturnType<typeof vi.fn> {
  return vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
}

describe("fileNameOf", () => {
  it("keeps the archive path's last segment, extension included", () => {
    expect(fileNameOf("media/posts/202402/photo.webp")).toBe("photo.webp");
    expect(fileNameOf("your_instagram_activity/messages/inbox/t/photos/a.mp4")).toBe("a.mp4");
    expect(fileNameOf("bare.jpg")).toBe("bare.jpg");
  });

  it("returns null when there is no filename to use", () => {
    expect(fileNameOf("media/posts/")).toBeNull();
    expect(fileNameOf("")).toBeNull();
  });
});

describe("downloadOriginal", () => {
  it("saves the original blob under the archive path's filename, not a ZIP", async () => {
    saveSpy();
    const order: string[] = [];
    const urls = {
      create: vi.fn(() => {
        order.push("create");
        return "blob:one";
      }),
      revoke: vi.fn(() => order.push("revoke")),
    };
    let saved = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved = this.download;
      order.push("click");
    });

    const result = await downloadOriginal("media/posts/202402/photo.webp", source(), urls);

    expect(result).toEqual({ ok: true });
    expect(saved).toBe("photo.webp");
    expect(urls.create).toHaveBeenCalledWith(BLOB);
    expect(order).toEqual(["create", "click", "revoke"]);
  });

  it("refuses an unsafe path before reading any bytes", async () => {
    saveSpy();
    const getMediaBlob = vi.fn(async (id: string): Promise<Blob | null> => {
      void id;
      return BLOB;
    });

    const result = await downloadOriginal("../../etc/passwd", { getMediaBlob });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("not a safe filename");
    expect(getMediaBlob).not.toHaveBeenCalled();
  });

  it("refuses an absolute path and a backslash", async () => {
    saveSpy();
    const getMediaBlob = vi.fn(async (id: string): Promise<Blob | null> => {
      void id;
      return BLOB;
    });

    for (const path of ["/etc/passwd", "posts\\a.jpg"]) {
      const result = await downloadOriginal(path, { getMediaBlob });
      expect(result.ok).toBe(false);
    }
    expect(getMediaBlob).not.toHaveBeenCalled();
  });

  it("fails with the reason when the blob is gone, and saves nothing", async () => {
    const click = saveSpy();
    const urls = { create: vi.fn(() => "blob:none"), revoke: vi.fn() };

    const result = await downloadOriginal("media/posts/a.jpg", source(null), urls);

    expect(result).toEqual({
      ok: false,
      reason: "“media/posts/a.jpg” is no longer stored, so nothing was downloaded.",
    });
    expect(click).not.toHaveBeenCalled();
    expect(urls.create).not.toHaveBeenCalled();
  });

  it("keeps a video's own extension", async () => {
    saveSpy();
    let saved = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved = this.download;
    });

    await downloadOriginal(
      "media/stories/202103/clip.mp4",
      source(new Blob(["v"], { type: "video/mp4" })),
      { create: () => "blob:v", revoke: () => {} },
    );

    expect(saved).toBe("clip.mp4");
  });
});
