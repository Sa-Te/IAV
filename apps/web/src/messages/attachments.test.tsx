// @vitest-environment jsdom
import type { MediaItemView, ThreadMessage } from "@instavault/core";
import type { ArchiveRepository } from "@instavault/storage";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaGrid } from "../media/MediaGrid.js";
import { RepositoryProvider } from "../repository/RepositoryContext.js";
import { ThreadConversation } from "./ThreadConversation.js";

const THREAD = "your_instagram_activity/messages/inbox/thread-1";
const AT = 1_700_000_000_000;

let blobCount = 0;

class FakeURL extends URL {
  static override createObjectURL = vi.fn(() => `blob:test-${++blobCount}`);
  static override revokeObjectURL = vi.fn();
}

function repository(overrides: Partial<ArchiveRepository> = {}): ArchiveRepository {
  return {
    listMedia: async () => ({ items: [], nextCursor: null }),
    listCategories: async () => [],
    getMediaBlob: async () => new Blob(["bytes"], { type: "image/jpeg" }),
    getCategory: async () => null,
    summary: async () => null,
    getThumbnail: async (path) => ({
      path,
      blob: new Blob(["poster"], { type: "image/webp" }),
      type: "image/webp",
      width: 256,
      height: 256,
      sourceBytes: 6,
    }),
    putThumbnail: async () => undefined,
    auditCounts: async () => ({ archive: 0, categories: 0, media: 0, thumbs: 0 }),
    ...overrides,
  };
}

function conversation(messages: readonly ThreadMessage[], source = repository()): void {
  render(
    <RepositoryProvider repository={source}>
      <ThreadConversation
        threadId="inbox/thread-1"
        summary={undefined}
        messages={messages}
        onBack={() => undefined}
      />
    </RepositoryProvider>,
  );
}

function message(overrides: Partial<ThreadMessage> = {}): ThreadMessage {
  return { sender: "alice", timestampMs: AT, text: "", attachments: [], ...overrides };
}

beforeEach(() => {
  blobCount = 0;
  vi.stubGlobal("URL", FakeURL);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("message attachments", () => {
  it("renders a photo as an image from a blob URL, with a type label", async () => {
    conversation([
      message({
        attachments: [{ uri: `${THREAD}/photos/one.jpg`, kind: "photo" }],
      }),
    ]);

    const image = await screen.findByTestId("attachment-image");
    expect(image.getAttribute("src")).toMatch(/^blob:test-/);
    expect(image.getAttribute("alt")).toBe("Photo attachment");
    expect(screen.getByText("Photo")).toBeDefined();
  });

  it("renders a video with its poster and duration", async () => {
    conversation(
      [
        message({
          attachments: [{ uri: `${THREAD}/videos/clip.mp4`, kind: "video" }],
        }),
      ],
      repository({
        getMediaBlob: async () => new Blob(["video"], { type: "video/mp4" }),
      }),
    );

    const video = await screen.findByTestId("attachment-video");
    await waitFor(() => expect(video.getAttribute("poster")).toMatch(/^blob:test-/));
    Object.defineProperty(video, "duration", { value: 12, configurable: true });
    fireEvent.loadedMetadata(video);

    expect(await screen.findByText(/Video · 0:12/)).toBeDefined();
  });

  it("renders an audio file as a player", async () => {
    conversation(
      [
        message({
          attachments: [{ uri: `${THREAD}/audio/voice.ogg`, kind: "audio" }],
        }),
      ],
      repository({
        getMediaBlob: async () => new Blob(["audio"], { type: "audio/ogg" }),
      }),
    );

    const audio = await screen.findByTestId("attachment-audio");
    expect(audio.hasAttribute("controls")).toBe(true);
    expect(screen.getByText("Audio")).toBeDefined();
  });

  it("renders no placeholder text above media that is present", async () => {
    conversation([
      message({
        text: "You sent an attachment.",
        attachments: [{ uri: `${THREAD}/photos/one.jpg`, kind: "photo" }],
      }),
    ]);

    await screen.findByTestId("attachment-image");
    expect(screen.queryByText("You sent an attachment.")).toBeNull();
    expect(screen.queryByText("Attachment not included in this export.")).toBeNull();
  });

  it("renders an explicit note when the placeholder has no media", () => {
    conversation([message({ text: "You sent an attachment." })]);

    expect(screen.getByText("Attachment not included in this export.")).toBeDefined();
    expect(screen.queryByText("You sent an attachment.")).toBeNull();
  });
});

describe("message media provenance in the gallery", () => {
  it("shows the family and thread and links to the conversation", () => {
    const item: MediaItemView = {
      id: `${THREAD}/photos/one.jpg`,
      caption: "",
      takenAt: 0,
      category: "messages_inbox",
    };

    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );

    render(
      <RepositoryProvider repository={repository()}>
        <MediaGrid items={[item]} source={repository()} onOpen={() => undefined} />
      </RepositoryProvider>,
    );

    expect(screen.getByText(/from messages/)).toBeDefined();
    const link = screen.getByRole("link", { name: "Open thread" });
    expect(link.getAttribute("href")).toBe("/categories/messages_inbox#inbox%2Fthread-1");
  });
});
