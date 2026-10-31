import { describe, expect, it } from "vitest";

import type { Category } from "../registry/types.js";
import { buildArchiveShape, compareShapes, type ArchiveInput } from "./drift.js";
import { renderDrift } from "./render.js";

/**
 * Why this file exists: `docs/DRIFT-<date>.md` is committed. If the renderer ever
 * leaks a value, a caption, a username or a filename into that document, the leak
 * is permanent and public. The report is only safe to commit because the text is
 * built from ids, key names, counts and fingerprints — and that is what this test
 * checks, with values chosen to be impossible to produce by accident.
 *
 * AGENTS.md §1.7: photos and messages are other people's data. A basename can be
 * someone's name; a caption definitely is.
 */

const CAPTION = "meet me at the pier on friday 9f2a";
const USERNAME = "zq_handle_9f2a";
const UNRECOGNISED_BASENAME = "notes_from_someone_9f2a.json";
const MEDIA_NAME = "someone_photo_9f2a.jpg";

const ROW: Category = {
  id: "messages_inbox",
  label: "Inbox threads",
  privacyTier: 5,
  variantRisk: "high",
  match: { basenames: [/^message_\d+\.json$/i] },
  signatures: [{ kind: "object", requiredKeys: ["messages", "participants"] }],
  mediaPath: "root-relative",
};

const OLD: ArchiveInput = {
  label: "old",
  json: [
    {
      path: "thread_9f2a/message_1.json",
      value: { messages: [{ text: CAPTION }], participants: [{ username: USERNAME }] },
    },
  ],
  media: [{ path: MEDIA_NAME, bytes: 10 }],
};

const NEW: ArchiveInput = {
  label: "new",
  json: [
    {
      path: "thread_9f2a/message_1.json",
      value: { messages: [{ text: CAPTION }], participants: [], extra_flag: true },
    },
    { path: UNRECOGNISED_BASENAME, value: { secret: CAPTION } },
  ],
  media: [{ path: MEDIA_NAME, bytes: 10 }],
};

function reportText(): string {
  const a = buildArchiveShape(OLD, [ROW]);
  const b = buildArchiveShape(NEW, [ROW]);
  return renderDrift(compareShapes(a, b), "2026-10-31");
}

describe("drift report privacy", () => {
  it("contains no value, filename or media name from the input", () => {
    const text = reportText();

    for (const secret of [
      CAPTION,
      USERNAME,
      UNRECOGNISED_BASENAME,
      "someone_photo_9f2a",
      "thread_9f2a",
    ]) {
      expect(text, `the rendered report leaked "${secret}"`).not.toContain(secret);
    }
  });

  it("still reports the structure it is supposed to report", () => {
    // Without this, an empty report would pass the test above.
    const text = reportText();

    expect(text).toContain("`messages_inbox`");
    expect(text).toContain("`extra_flag`");
    expect(text).toContain("fmt-");
    expect(text).toContain("Unrecognised");
  });
});
