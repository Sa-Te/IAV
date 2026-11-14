import { describe, expect, it } from "vitest";

import { groupMessages } from "./bubbles.js";
import type { ThreadMessage } from "./threads.js";

const AT = (day: number, hour = 12): number => Date.UTC(2024, 4, day, hour) + 0;

function message(sender: string, timestampMs: number | null, text = "hi"): ThreadMessage {
  return { sender, timestampMs, text, attachments: [] };
}

describe("groupMessages", () => {
  it("groups consecutive messages from one sender on one day", () => {
    const groups = groupMessages([
      message("alice", AT(1)),
      message("alice", AT(1, 13)),
      message("bob", AT(1, 14)),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.sender).toBe("alice");
    expect(groups[0]?.messages).toHaveLength(2);
    expect(groups[1]?.sender).toBe("bob");
  });

  it("starts a new group when the day changes, even for the same sender", () => {
    const groups = groupMessages([message("alice", AT(1)), message("alice", AT(2))]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.dayKey).not.toBe(groups[1]?.dayKey);
    expect(groups[0]?.date).not.toBeNull();
  });

  it("starts a new group when the sender changes and then returns", () => {
    const groups = groupMessages([
      message("alice", AT(1)),
      message("bob", AT(1)),
      message("alice", AT(1)),
    ]);
    expect(groups.map((group) => group.sender)).toEqual(["alice", "bob", "alice"]);
  });

  it("keeps messages with no timestamp in an undated group", () => {
    const groups = groupMessages([message("alice", null), message("alice", null)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.dayKey).toBe("undated");
    expect(groups[0]?.date).toBeNull();
  });

  it("returns no groups for an empty conversation", () => {
    expect(groupMessages([])).toEqual([]);
  });
});
