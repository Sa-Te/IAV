import { describe, expect, it } from "vitest";

import { diffConnections, type ConnectionRecord } from "./diff.js";

const AT = 1_700_000_000;

function follower(username: string, timestamp = AT): Record<string, unknown> {
  return {
    title: "",
    media_list_data: [],
    string_list_data: [
      { href: `https://www.instagram.com/${username}`, value: username, timestamp },
    ],
  };
}

function following(username: string, timestamp = AT): Record<string, unknown> {
  return {
    title: username,
    string_list_data: [{ href: `https://www.instagram.com/_u/${username}`, timestamp }],
  };
}

function followersRecord(entries: readonly unknown[]): ConnectionRecord {
  return { data: entries };
}

function followingRecord(entries: readonly unknown[]): ConnectionRecord {
  return { data: { relationships_following: entries } };
}

describe("diffConnections", () => {
  it("separates a mutual pair, a follow-only and a follower-only person", () => {
    const diff = diffConnections(
      followersRecord([follower("alice"), follower("carol")]),
      followingRecord([following("alice"), following("bob")]),
    );

    expect(diff.mutual.map((person) => person.username)).toEqual(["alice"]);
    expect(diff.followOnly.map((person) => person.username)).toEqual(["bob"]);
    expect(diff.followerOnly.map((person) => person.username)).toEqual(["carol"]);
  });

  it("matches usernames case-insensitively", () => {
    const diff = diffConnections(
      followersRecord([follower("Alice")]),
      followingRecord([following("alice")]),
    );
    expect(diff.mutual).toHaveLength(1);
  });

  it("keeps an entry with no username in unmatched and in neither total", () => {
    const diff = diffConnections(
      followersRecord([follower("alice"), { title: "", string_list_data: [{ timestamp: AT }] }]),
      followingRecord([following("alice")]),
    );

    expect(diff.mutual).toHaveLength(1);
    expect(diff.followerOnly).toHaveLength(0);
    expect(diff.followOnly).toHaveLength(0);
    expect(diff.unmatched).toHaveLength(1);
    expect(diff.unmatched[0]?.username).toBeNull();
    expect(diff.unmatched[0]?.raw).toBeDefined();
  });

  it("handles empty inputs", () => {
    expect(diffConnections(followersRecord([]), followingRecord([]))).toEqual({
      followerTotal: 0,
      followingTotal: 0,
      mutual: [],
      followOnly: [],
      followerOnly: [],
      unmatched: [],
    });
  });

  it("counts every input person exactly once across the sets", () => {
    const diff = diffConnections(
      followersRecord([follower("a"), follower("b"), { title: "" }]),
      followingRecord([following("b"), following("c"), { title: "" }]),
    );

    // b is in both inputs but is one mutual person; the two username-less
    // entries are unmatched, so five distinct records are represented.
    expect(
      diff.mutual.length +
        diff.followOnly.length +
        diff.followerOnly.length +
        diff.unmatched.length,
    ).toBe(5);
  });
});
