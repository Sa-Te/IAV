// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { saveBlob, zipFilename } from "./saveBlob.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("zipFilename", () => {
  it("names the file after the local day it was taken", () => {
    expect(zipFilename(new Date(2026, 10, 4, 23, 30))).toBe("instavault-2026-11-04.zip");
  });

  it("pads single-digit months and days", () => {
    expect(zipFilename(new Date(2027, 0, 9))).toBe("instavault-2027-01-09.zip");
  });
});

describe("saveBlob", () => {
  it("clicks one download anchor and revokes the object URL immediately after", () => {
    const order: string[] = [];
    const create = vi.fn(() => {
      order.push("create");
      return "blob:zip";
    });
    const revoke = vi.fn(() => order.push("revoke"));
    let href = "";
    let download = "";
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      order.push("click");
      href = this.href;
      download = this.download;
    });

    saveBlob(new Blob(["zip bytes"]), "instavault-2026-11-14.zip", { create, revoke });

    expect(create).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(href).toBe("blob:zip");
    expect(download).toBe("instavault-2026-11-14.zip");
    expect(order).toEqual(["create", "click", "revoke"]);
  });

  it("leaves no anchor in the document", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    saveBlob(new Blob(["x"]), "a.zip", { create: () => "blob:x", revoke: () => {} });

    expect(document.querySelector("a")).toBeNull();
  });
});
