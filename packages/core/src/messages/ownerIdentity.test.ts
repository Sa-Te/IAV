import { describe, expect, it } from "vitest";

import { identifyOwnerSender, toOwnerIdentity } from "./ownerIdentity.js";

function personal(name: string, username: string): Record<string, unknown> {
  return {
    profile_user: [
      {
        title: "",
        media_map_data: {},
        string_map_data: {
          Name: { value: name },
          Username: { value: username },
        },
      },
    ],
  };
}

describe("toOwnerIdentity", () => {
  it("reads the Name and Username from personal_information", () => {
    expect(toOwnerIdentity({ data: personal("Owner Name", "owner") })).toEqual({
      name: "Owner Name",
      username: "owner",
    });
  });

  it("keeps the username when Name is empty", () => {
    expect(toOwnerIdentity({ data: personal("", "owner") })).toEqual({
      name: null,
      username: "owner",
    });
  });

  it("returns null when there is no profile_user", () => {
    expect(toOwnerIdentity({ data: {} })).toBeNull();
  });
});

describe("identifyOwnerSender", () => {
  const owner = { name: "Owner Name", username: "owner" };

  it("matches exactly one sender by username or name, case-insensitively", () => {
    expect(identifyOwnerSender(["alice", "OWNER", "bob"], owner)).toBe("OWNER");
    expect(identifyOwnerSender(["alice", "owner name", "bob"], owner)).toBe("owner name");
  });

  it("returns null when no sender matches", () => {
    expect(identifyOwnerSender(["alice", "bob"], owner)).toBeNull();
  });

  it("returns null when two distinct senders match", () => {
    expect(identifyOwnerSender(["owner", "Owner Name", "alice"], owner)).toBeNull();
  });

  it("ignores duplicates of the same sender", () => {
    expect(identifyOwnerSender(["owner", "owner", "alice"], owner)).toBe("owner");
  });

  it("returns null without an owner identity", () => {
    expect(identifyOwnerSender(["owner"], null)).toBeNull();
  });
});
