import { describe, expect, it } from "vitest";

import { toAvatarItemsView } from "./avatarItemsView.js";

const item = (index: number) => ({
  item: `https://scontent.invalid/avatar-${index}.png?token=${index}`,
  type: "FREE",
  acquisition_time: 1_700_000_000 + index,
});

describe("toAvatarItemsView", () => {
  it("reads every avatar's URL, type and acquisition time", () => {
    const view = toAvatarItemsView({
      data: { ig_avatar_marketplace_avatar_items: [item(0), item(1)] },
    });

    expect(view?.items).toHaveLength(2);
    expect(view?.items[0]?.ordinal).toBe(1);
    expect(view?.items[0]?.item).toBe(item(0).item);
    expect(view?.items[0]?.type).toBe("FREE");
    expect(view?.items[0]?.acquiredAt).toBe(1_700_000_000);
    expect(view?.items[0]?.acquiredDate).toEqual(expect.any(String));
  });

  it("keeps the URL verbatim, never as image bytes", () => {
    const view = toAvatarItemsView({ data: [item(0)] });
    expect(view?.items[0]?.item.startsWith("https://")).toBe(true);
  });

  it("does not turn a zero acquisition time into 1970", () => {
    const view = toAvatarItemsView({
      data: [{ item: "https://x.invalid/a.png", acquisition_time: 0 }],
    });
    expect(view?.items[0]?.acquiredDate).toBeNull();
  });

  it("reads a signed URL's expiry and refuses to invent one", () => {
    const view = toAvatarItemsView({
      data: [
        { item: "https://x.invalid/a.png?oe=6AE7C213" },
        { item: "https://x.invalid/b.png?oe=not-hex" },
        { item: "not a url" },
      ],
    });
    expect(view?.items[0]?.expiresAt).toBe(Number.parseInt("6AE7C213", 16));
    expect(view?.items[1]?.expiresAt).toBeNull();
    expect(view?.items[2]?.expiresAt).toBeNull();
  });

  it("treats an empty array as a present category with no items", () => {
    expect(toAvatarItemsView({ data: [] })).toEqual({ kind: "avatar-items", items: [] });
  });

  it("returns null when an entry has no item string", () => {
    expect(toAvatarItemsView({ data: [{ type: "FREE" }] })).toBeNull();
    expect(toAvatarItemsView({ data: { mystery: [{ item: 1 }] } })).toBeNull();
    expect(toAvatarItemsView({ data: undefined })).toBeNull();
  });
});
