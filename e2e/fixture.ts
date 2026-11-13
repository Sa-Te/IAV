import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

import { zipSync } from "fflate";

/**
 * A synthetic export, built in a temp directory on every call.
 *
 * AGENTS.md §9: integration fixtures are synthetic and generated — never
 * `archive/`, never a redacted slice of it. The shapes are the ones measured in
 * `packages/core/test/fixtures/synthetic/`; the counts are small on purpose.
 *
 * The expectation is returned next to the ZIP so the test asserts what the
 * fixture *declares*, not a second copy of the parser's rules.
 */

export interface Fixture {
  /** Absolute path of the ZIP, outside the repo. */
  readonly zipPath: string;
  readonly expected: {
    readonly categories: number;
    readonly entries: number;
    readonly mediaStored: number;
    readonly mediaMissing: number;
    readonly unrecognised: number;
  };
}

const POSTS = 12;
const STORIES = 4;
const PARTICIPANTS = 2;
const INBOX_MESSAGES = 3;
const REQUESTS_MESSAGES = 1;
const CARD = 256;

/** A solid 256² PNG: real image bytes, no photo, ~1 kB compressed. */
function cardPng(shade: number): Uint8Array {
  const stride = 1 + CARD * 3;
  const raw = new Uint8Array(CARD * stride);
  for (let y = 0; y < CARD; y += 1) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < CARD; x += 1) {
      const at = y * stride + 1 + x * 3;
      raw[at] = shade;
      raw[at + 1] = (shade * 3) % 256;
      raw[at + 2] = 255 - shade;
    }
  }

  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const body = new Uint8Array(4 + data.length);
    for (let index = 0; index < 4; index += 1) body[index] = type.charCodeAt(index);
    body.set(data, 4);
    const out = new Uint8Array(body.length + 8);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(body, 4);
    view.setUint32(out.length - 4, crc32(body));
    return out;
  };

  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, CARD);
  headerView.setUint32(4, CARD);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

export function buildFixture(): Fixture {
  const files: Record<string, Uint8Array> = {};
  const encode = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));

  const posts = Array.from({ length: POSTS }, (_, index) => {
    const path = `media/posts/202401/fixture-${index + 1}.png`;
    files[path] = cardPng((index * 20) % 256);
    return {
      media: [{ uri: path, creation_timestamp: 1700000000 + index, title: `post ${index + 1}` }],
    };
  });

  const stories = Array.from({ length: STORIES }, (_, index) => {
    const path = `media/stories/202401/story-${index + 1}.png`;
    files[path] = cardPng((index * 60) % 256);
    return { uri: path, creation_timestamp: 1703000000 + index, title: `story ${index + 1}` };
  });

  const thread = (count: number) => ({
    participants: Array.from({ length: PARTICIPANTS }, (_, index) => ({
      name: `fixture-${index === 0 ? "sender" : "other"}`,
    })),
    messages: Array.from({ length: count }, (_, index) => ({
      sender_name: "fixture-sender",
      timestamp_ms: 1705000000000 + index,
      content: `message ${index + 1}`,
    })),
    title: "fixture-sender",
    thread_path: "inbox/thread_a",
    is_still_participant: true,
    magic_words: [],
  });

  files["content/posts_1.json"] = encode(posts);
  files["content/stories.json"] = encode({ ig_stories: stories });
  files["content/messages/inbox/thread_a/message_1.json"] = encode(thread(INBOX_MESSAGES));
  files["content/messages/message_requests/thread_b/message_1.json"] = encode(
    thread(REQUESTS_MESSAGES),
  );
  // No rule claims this shape, so it lands in the unrecognised bucket (AGENTS.md §6).
  files["content/mystery_shape.json"] = encode({ mystery_data: [{ alpha: 1 }] });

  const directory = mkdtempSync(join(tmpdir(), "instavault-e2e-"));
  const zipPath = join(directory, "instagram-fixture.zip");
  writeFileSync(zipPath, zipSync(files));

  return {
    zipPath,
    expected: {
      // Four resolved categories: posts, stories, the two message families. The
      // unrecognised shape is a summary row, not a category row — nothing claims it.
      categories: 4,
      // `entryCountOf` counts a thread file's first array value, which is
      // `participants`, not `messages` (packages/core/src/ingest/payload.ts).
      entries: posts.length + stories.length + PARTICIPANTS + PARTICIPANTS,
      mediaStored: posts.length + stories.length,
      mediaMissing: 0,
      unrecognised: 1,
    },
  };
}
