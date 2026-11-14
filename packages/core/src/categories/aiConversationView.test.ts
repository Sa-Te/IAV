import { describe, expect, it } from "vitest";

import { toAiConversationsView } from "./aiConversationView.js";

const AT = 1_700_000_000;

function conversation(): Record<string, unknown> {
  return {
    title: "A conversation",
    timestamp: AT,
    media: [],
    fbid: "1",
    label_values: [
      { label: "Unread", value: "false" },
      { label: "Summary", value: "A short summary" },
      { label: "Image" },
      {
        title: "Conversation",
        dict: [
          {
            title: "",
            dict: [
              { label: "Message", value: "" },
              { label: "Message", value: "first turn" },
              { label: "Name", value: "User" },
              { timestamp_value: AT + 1 },
            ],
          },
          {
            title: "",
            dict: [
              { label: "Message", value: "second turn" },
              { label: "Name", value: "Assistant" },
              { timestamp_value: AT + 2 },
            ],
          },
        ],
      },
      { title: "Empty", dict: [] },
    ],
  };
}

describe("toAiConversationsView", () => {
  it("reads the title, header fields and the ordered turns", () => {
    const view = toAiConversationsView({ data: [conversation()] });

    expect(view?.total).toBe(1);
    const [record] = view?.conversations ?? [];
    expect(record?.title).toBe("A conversation");
    expect(record?.fields.map((field) => field.label)).toEqual(["Created", "Summary"]);
    expect(record?.turns).toEqual([
      {
        role: "User",
        text: "first turn",
        timestamp: AT + 1,
        date: expect.any(String),
      },
      {
        role: "Assistant",
        text: "second turn",
        timestamp: AT + 2,
        date: expect.any(String),
      },
    ]);
  });

  it("returns null when the record has no turn container", () => {
    expect(
      toAiConversationsView({
        data: [{ title: "x", timestamp: AT, label_values: [{ label: "Summary", value: "s" }] }],
      }),
    ).toBeNull();
  });

  it("reads two records when both are shaped this way", () => {
    expect(toAiConversationsView({ data: [conversation(), conversation()] })?.total).toBe(2);
  });
});
