import { describe, expect, it } from "vitest";

import { toTagListView } from "./tagView.js";

const AT = Date.UTC(2020, 4, 1, 12) / 1000;

function entry(tag: string, timestamp: number | null = AT): Record<string, unknown> {
  return {
    title: "",
    media_list_data: [],
    string_list_data: [
      {
        href: `https://www.instagram.com/${tag}`,
        value: tag,
        ...(timestamp === null ? {} : { timestamp }),
      },
    ],
  };
}

describe("toTagListView", () => {
  it("reads the tag, its page URL and its date", () => {
    const view = toTagListView({
      id: "following_hashtags",
      data: { relationships_following_hashtags: [entry("tag")] },
    });

    expect(view).toEqual({
      kind: "tags",
      tags: [{ tag: "tag", url: "https://www.instagram.com/tag", timestamp: AT }],
      total: 1,
      hasDates: true,
    });
  });

  it("keeps a tag without a date and reports that dates are not universal", () => {
    const view = toTagListView({
      id: "following_hashtags",
      data: [entry("a"), entry("b", null)],
    });
    expect(view?.hasDates).toBe(true);
    expect(view?.tags[1]?.timestamp).toBeNull();
  });

  it("returns null for any other category, even with a hashtag-like entry", () => {
    expect(toTagListView({ id: "followers", data: [entry("tag")] })).toBeNull();
  });

  it("returns null when the record holds no readable tag", () => {
    expect(
      toTagListView({ id: "following_hashtags", data: [{ string_list_data: [] }] }),
    ).toBeNull();
    expect(toTagListView({ id: "following_hashtags", data: null })).toBeNull();
  });
});
