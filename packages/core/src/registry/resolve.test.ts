import { describe, expect, it } from "vitest";

import { resolveCategory } from "./resolve.js";

describe("resolveCategory — tier 1 (basename)", () => {
  it("matches a simple basename", () => {
    expect(resolveCategory({ path: "stories.json", sample: {} })).toEqual({
      ok: true,
      id: "stories",
      tier: 1,
    });
  });

  it("treats the numeric suffix as optional", () => {
    const paths = ["posts_1.json", "posts_2.json", "posts.json", "Posts_12.JSON"];
    for (const path of paths) {
      expect(resolveCategory({ path, sample: null })).toEqual({
        ok: true,
        id: "posts",
        tier: 1,
      });
    }
  });

  it("matches the two apostrophe filenames", () => {
    expect(resolveCategory({ path: "posts_you're_not_interested_in.json", sample: null })).toEqual({
      ok: true,
      id: "posts_you're_not_interested_in",
      tier: 1,
    });
    expect(resolveCategory({ path: "follow_requests_you've_received.json", sample: null })).toEqual(
      { ok: true, id: "follow_requests_you've_received", tier: 1 },
    );
  });

  it("separates the 254 message threads by parent folder, not by basename", () => {
    const sample = { participants: [], messages: [], title: "t", thread_path: "p" };

    expect(resolveCategory({ path: "messages/inbox/thread_a/message_1.json", sample })).toEqual({
      ok: true,
      id: "messages_inbox",
      tier: 1,
    });

    expect(
      resolveCategory({ path: "messages/message_requests/thread_b/message_1.json", sample }),
    ).toEqual({ ok: true, id: "messages_requests", tier: 1 });
  });

  it("does not match a message thread whose parent folder is neither", () => {
    const result = resolveCategory({ path: "messages/elsewhere/message_1.json", sample: {} });
    expect(result.ok).toBe(false);
  });
});

describe("resolveCategory — tier 2 (structure)", () => {
  it("recognises a renamed file by its signature", () => {
    const sample = [{ media: [{ uri: "media/posts/202401/x.jpg" }] }];
    expect(resolveCategory({ path: "somethingelse.json", sample })).toEqual({
      ok: true,
      id: "posts",
      tier: 2,
    });
  });

  it("recognises an object-shaped category by its wrapper key", () => {
    expect(resolveCategory({ path: "renamed.json", sample: { ig_stories: [] } })).toEqual({
      ok: true,
      id: "stories",
      tier: 2,
    });
  });

  it("reports ambiguity instead of guessing when two rows fit", () => {
    // `interest_categories` and `link_history` were both root arrays with
    // {fbid, label_values, media, timestamp} in the first export. After M7b the
    // label/value envelope is the shape of ~15 rows at once, so a renamed envelope
    // file names many candidates — which is the point: it refuses rather than
    // guessing (ADR 0002, ADR 0008).
    const sample = [{ fbid: "1", label_values: [], media: [], timestamp: 1 }];
    const result = resolveCategory({ path: "mystery.json", sample });

    expect(result).toMatchObject({ ok: false, reason: "ambiguous" });
    const candidates = result.ok ? [] : result.reason === "ambiguous" ? result.candidates : [];
    expect(candidates).toEqual(expect.arrayContaining(["interest_categories", "link_history"]));
    expect(candidates.length).toBeGreaterThan(2);
  });
});

describe("resolveCategory — tier 3 (unrecognised)", () => {
  it("buckets a file that matches nothing by name and nothing by shape", () => {
    expect(resolveCategory({ path: "totally_new.json", sample: { something: 1 } })).toEqual({
      ok: false,
      reason: "unrecognised",
      path: "totally_new.json",
    });
  });

  it("does not treat malformed input as a match", () => {
    expect(resolveCategory({ path: "broken.json", sample: undefined }).ok).toBe(false);
    expect(resolveCategory({ path: "broken.json", sample: null }).ok).toBe(false);
  });

  it("does not match an empty array against an array signature", () => {
    // Nothing to inspect, so nothing may be claimed.
    expect(resolveCategory({ path: "empty.json", sample: [] })).toEqual({
      ok: false,
      reason: "unrecognised",
      path: "empty.json",
    });
  });
});
