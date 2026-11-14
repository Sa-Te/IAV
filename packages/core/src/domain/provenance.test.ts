import { describe, expect, it } from "vitest";

import { mediaProvenance } from "./provenance.js";

describe("mediaProvenance", () => {
  it("parses a measured message path into family, thread and filename", () => {
    expect(
      mediaProvenance("your_instagram_activity/messages/inbox/thread-1/photos/photo-1.jpg"),
    ).toEqual({
      kind: "message",
      family: "inbox",
      threadFolder: "thread-1",
      filename: "photo-1.jpg",
    });
  });

  it("parses a message-request path and a video path", () => {
    expect(
      mediaProvenance("your_instagram_activity/messages/message_requests/thread-2/videos/clip.mp4"),
    ).toEqual({
      kind: "message",
      family: "message_requests",
      threadFolder: "thread-2",
      filename: "clip.mp4",
    });
  });

  it("parses a category media path into the category branch", () => {
    expect(mediaProvenance("media/stories/202003/story-1.jpg")).toEqual({
      kind: "category",
      categoryId: "stories",
    });
    expect(mediaProvenance("media/archived_posts/201909/post-1.jpg")).toEqual({
      kind: "category",
      categoryId: "archived_posts",
    });
  });

  it("accepts backslashes and leading slashes", () => {
    expect(
      mediaProvenance("/your_instagram_activity\\messages\\inbox\\thread-3\\audio\\voice.ogg"),
    ).toEqual({
      kind: "message",
      family: "inbox",
      threadFolder: "thread-3",
      filename: "voice.ogg",
    });
  });

  it("falls back to the category branch rather than returning null", () => {
    expect(mediaProvenance("something/else.bin")).toEqual({
      kind: "category",
      categoryId: "unrecognised",
    });
  });
});
