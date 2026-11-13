import { describe, expect, it } from "vitest";

import { toEventListView, type EventEntry } from "./eventListView.js";

/**
 * The details behind the T3 table: the two date shapes the comment categories use,
 * and the sticker/poll values the row renders instead of printing. The per-category
 * table lives in `t3EventList.test.ts`.
 */

const AT = 1_700_000_000;

function firstEntry(data: unknown): EventEntry {
  const view = toEventListView({ data });
  expect(view).not.toBeNull();
  if (view === null) throw new Error("not an event list");
  const month = view.months[0];
  const day = month?.days[0];
  const entry = day?.entries[0];
  if (entry === undefined) throw new Error("no entry");
  return entry;
}

describe("T3 event list — the two date shapes it actually uses", () => {
  it("dates a comment from string_map_data.Time and keeps it out of the fields", () => {
    const entry = firstEntry({
      string_map_data: {
        Comment: { value: "a comment" },
        Time: { timestamp: AT },
      },
    });

    expect(entry.timestamp).toBe(AT);
    expect(entry.fields.map((field) => field.label)).not.toContain("Time");
  });

  it("dates a liked comment from string_list_data and keeps the account as the hero", () => {
    const entry = firstEntry({
      likes_comment_likes: [
        {
          title: "someone",
          string_list_data: [
            { href: "https://www.instagram.com/p/CCC333/", value: "True", timestamp: AT },
          ],
        },
      ],
    });

    expect(entry.timestamp).toBe(AT);
    expect(entry.hero?.label).toBe("title");
    expect(entry.url).toBe("https://www.instagram.com/p/CCC333/");
  });
});

describe("T3 event list — a sticker and a poll show their own values", () => {
  const container = (
    title: string,
    dict: readonly Record<string, unknown>[],
  ): Record<string, unknown> => ({
    dict,
    title,
  });

  it("uses the export's colours for an emoji slider instead of printing them", () => {
    const entry = firstEntry([
      {
        fbid: "1",
        timestamp: AT,
        media: [],
        label_values: [
          { label: "Question", value: "a slider" },
          { label: "Emoji", value: "😍" },
          { label: "Text colour", value: "#262626" },
          { label: "Background colour", value: "#FFFFFF" },
          { label: "URL", href: "https://www.instagram.com/stories/x/1", value: "" },
        ],
      },
    ]);

    expect(entry.preview).toEqual({
      kind: "sticker",
      emoji: "😍",
      textColour: "#262626",
      backgroundColour: "#FFFFFF",
    });
    // Consumed by the preview: no "Text colour: #262626" row in the field list.
    expect(entry.fields.map((field) => field.label)).not.toContain("Text colour");
    expect(entry.fields.map((field) => field.label)).not.toContain("Background colour");
    expect(entry.fields.map((field) => field.label)).not.toContain("Emoji");
  });

  it("pairs each poll option with its own font size and keeps the colour", () => {
    const entry = firstEntry([
      {
        fbid: "1",
        timestamp: AT,
        media: [],
        label_values: [
          { label: "Question", value: "a poll" },
          { label: "Option 1", value: "Yes" },
          { label: "Option 2", value: "No" },
          { label: "Option 3", value: "" },
          { label: "Option 1 font size", value: "35" },
          { label: "Option 2 font size", value: "22" },
          { label: "Option 3 font size", value: "0" },
          { label: "Colour", value: "Black" },
          { label: "Anonymous poll", value: "False" },
        ],
      },
    ]);

    expect(entry.preview).toEqual({
      kind: "poll",
      colour: "Black",
      options: [
        { text: "Yes", size: 35 },
        { text: "No", size: 22 },
      ],
    });
    const labels = entry.fields.map((field) => field.label);
    expect(labels).not.toContain("Option 1");
    expect(labels).not.toContain("Option 1 font size");
    expect(labels).not.toContain("Colour");
    // The rest of the poll is still a field list.
    expect(labels).toContain("Anonymous poll");
  });

  it("reads the story link a reaction keeps inside a label-less container", () => {
    const storyUrl = "https://www.instagram.com/stories/someone/2928014490711451345";
    const entry = firstEntry({
      fbid: "1",
      timestamp: AT,
      media: [],
      label_values: [
        { label: "Emoji", value: "😍" },
        container("Owner", [
          container("", [
            { label: "URL", value: storyUrl, href: storyUrl },
            { label: "Caption", value: "a story caption" },
            container("Owner", [{ label: "URL", value: "", href: "" }]),
          ]),
        ]),
      ],
    });

    expect(entry.url).toBe(storyUrl);
    expect(entry.shortcode).toBeNull();
  });

  it("reads the story link from a question's Media container", () => {
    const storyUrl = "https://www.instagram.com/stories/someone/111";
    const entry = firstEntry([
      {
        fbid: "1",
        timestamp: AT,
        media: [],
        label_values: [
          { label: "Question", value: "a question" },
          { label: "Answer", value: "an answer" },
          container("Media", [container("", [{ label: "URL", value: storyUrl, href: storyUrl }])]),
        ],
      },
    ]);

    expect(entry.url).toBe(storyUrl);
  });

  it("does not invent a link when no container holds one", () => {
    const entry = firstEntry([
      {
        fbid: "1",
        timestamp: AT,
        media: [],
        label_values: [
          { label: "Question", value: "a question" },
          { label: "Answer", value: "an answer" },
          container("Media", [container("", [{ label: "Title", value: "" }])]),
        ],
      },
    ]);

    expect(entry.url).toBeNull();
    expect(entry.shortcode).toBeNull();
  });

  it("keeps the plain field list for a category with neither shape", () => {
    const entry = firstEntry([
      {
        fbid: "1",
        timestamp: AT,
        media: [],
        label_values: [{ label: "Name", value: "a collection" }],
      },
    ]);

    expect(entry.preview).toBeNull();
  });
});
