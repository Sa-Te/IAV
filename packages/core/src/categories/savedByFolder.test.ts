import { describe, expect, it } from "vitest";

import { toSavedCollectionsView, toSavedPostsByFolder } from "./savedByFolder.js";

/**
 * Real-shaped fixtures: a collection is a label/value envelope whose saved posts
 * are nested in a label-less container, one `{ title, dict }` wrapper per post
 * (docs/T3-DESIGN.md §4). There is no membership key across files; the URL is the
 * identity.
 */

const post = (url: string, caption: string): unknown => ({
  title: "",
  dict: [
    { label: "URL", value: url, href: url },
    { label: "Caption", value: caption },
    { label: "Title", value: "" },
    { dict: [], title: "Hashtags" },
    {
      title: "Owner",
      dict: [{ title: "", dict: [{ label: "Name", value: "someone" }] }],
    },
  ],
});

const collection = (name: string, posts: readonly unknown[]): unknown => ({
  fbid: "1",
  timestamp: 1717963999,
  media: [],
  label_values: [
    { label: "Name", value: name },
    { label: "Type", value: "Default" },
    { label: "Privacy", value: "Private" },
    { label: "Update time", timestamp_value: 1717964000 },
    { dict: posts },
  ],
});

const COLLECTIONS = [
  collection("first", [
    post("https://www.instagram.com/p/AAA111/", "one"),
    post("https://www.instagram.com/p/BBB222/", "two"),
  ]),
  collection("empty", []),
];

const SAVED_POSTS = [
  {
    fbid: "1",
    timestamp: 1_700_000_000,
    media: [],
    label_values: [
      {
        label: "URL",
        value: "https://www.instagram.com/p/AAA111/",
        href: "https://www.instagram.com/p/AAA111/",
      },
      { label: "Caption", value: "one" },
      { label: "Title", value: "" },
    ],
  },
  {
    fbid: "2",
    timestamp: 1_700_000_100,
    media: [],
    label_values: [
      {
        label: "URL",
        value: "https://www.instagram.com/p/CCC333/",
        href: "https://www.instagram.com/p/CCC333/",
      },
      { label: "Caption", value: "loose" },
      { label: "Title", value: "" },
    ],
  },
];

describe("toSavedCollectionsView", () => {
  it("puts each collection's nested posts inside that folder", () => {
    const view = toSavedCollectionsView({ data: COLLECTIONS });

    expect(view).not.toBeNull();
    if (view === null) return;
    expect(view.folders.map((folder) => folder.name)).toEqual(["first", "empty"]);
    expect(view.folders[0]?.posts.map((item) => item.url)).toEqual([
      "https://www.instagram.com/p/AAA111/",
      "https://www.instagram.com/p/BBB222/",
    ]);
    expect(view.folders[0]?.posts.map((item) => item.caption)).toEqual(["one", "two"]);
    expect(view.folders[1]?.posts).toEqual([]);
    expect(view.total).toBe(2);
    expect(view.loose).toEqual([]);
    expect(view.folders[0]?.kind).toBe("Default");
    expect(view.folders[0]?.privacy).toBe("Private");
    expect(view.folders[0]?.updated).not.toBeNull();
  });

  it("refuses a record with no collection name instead of inventing one", () => {
    const nameless = { label_values: [{ label: "Type", value: "Default" }] };
    expect(toSavedCollectionsView({ data: [nameless] })).toBeNull();
  });

  it("returns null for a payload that is not a list of collections", () => {
    expect(toSavedCollectionsView({ data: { name: "one" } })).toBeNull();
  });

  it("treats an empty file as no collections", () => {
    expect(toSavedCollectionsView({ data: [] })).toEqual({
      kind: "saved-by-folder",
      folders: [],
      loose: [],
      total: 0,
    });
  });
});

describe("toSavedPostsByFolder", () => {
  it("gives a folder's post the date from the flat list, and keeps the rest loose", () => {
    const collections = toSavedCollectionsView({ data: COLLECTIONS });
    const view = toSavedPostsByFolder({ data: SAVED_POSTS }, collections);

    expect(view).not.toBeNull();
    if (view === null) return;
    expect(view.total).toBe(2);
    expect(view.folders[0]?.posts).toHaveLength(2);
    expect(view.folders[0]?.posts[0]?.date).not.toBeNull();
    // The second nested post is not in the flat list, so it has no date.
    expect(view.folders[0]?.posts[1]?.date).toBeNull();
    expect(view.loose.map((item) => item.url)).toEqual(["https://www.instagram.com/p/CCC333/"]);
  });

  it("keeps every post loose when no collection exists", () => {
    const view = toSavedPostsByFolder({ data: SAVED_POSTS }, null);

    expect(view?.folders).toEqual([]);
    expect(view?.loose).toHaveLength(2);
  });

  it("does not lose a post that two collections both list", () => {
    const twice = [
      collection("a", [post("https://www.instagram.com/p/AAA111/", "one")]),
      collection("b", [post("https://www.instagram.com/p/AAA111/", "one")]),
    ];
    const collections = toSavedCollectionsView({ data: twice });
    const view = toSavedPostsByFolder({ data: SAVED_POSTS }, collections);

    expect(view?.folders.map((folder) => folder.posts.length)).toEqual([1, 1]);
    // Claimed by both, so it is not also loose.
    expect(view?.loose.map((item) => item.url)).toEqual(["https://www.instagram.com/p/CCC333/"]);
  });

  it("returns null for a payload that is not a saved-post list", () => {
    expect(toSavedPostsByFolder({ data: [{ nope: true }] }, null)).toBeNull();
  });
});
