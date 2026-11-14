import { describe, expect, it } from "vitest";

import { conversationCsv, csvFilename } from "./csv.js";
import type { ThreadMessage } from "./threads.js";

const AT = Date.UTC(2024, 4, 1, 12);

function message(text = "hello", attachments: ThreadMessage["attachments"] = []): ThreadMessage {
  return { sender: "alice", timestampMs: AT, text, attachments };
}

describe("conversationCsv", () => {
  it("starts with a UTF-8 BOM and uses CRLF lines", () => {
    const csv = conversationCsv([message()]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv.slice(1).split("\r\n")[0]).toBe(
      "date,sender,text,attachment_count,attachment_paths",
    );
  });

  it("quotes a field containing a comma, a quote and a newline", () => {
    const csv = conversationCsv([message('a,b "quoted"\nnext')]);
    expect(csv).toContain('"a,b ""quoted""\nnext"');
  });

  it("prefixes a formula cell with one apostrophe, unconditionally", () => {
    const csv = conversationCsv([message('=HYPERLINK("http://x")')]);
    // The cell is quoted because it contains quotes; the formula itself begins
    // with the apostrophe inside the quotes.
    expect(csv).toContain("\"'=HYPERLINK");
    expect(csv).not.toContain(',"=HYPERLINK');
  });

  it("prefixes an unquoted formula cell so it does not start with =", () => {
    const csv = conversationCsv([message("=SUM(A1:A2)")]);
    expect(csv).toContain(",'=SUM(A1:A2),");
  });

  it("also guards +, - and @ at the first character", () => {
    for (const value of ["+1", "-1", "@cmd"]) {
      const csv = conversationCsv([message(value)]);
      expect(csv).toContain(`'${value}`);
    }
  });

  it("writes the attachment count and paths", () => {
    const csv = conversationCsv([
      message("photo", [{ uri: "messages/inbox/t/photos/a.jpg", kind: "photo" }]),
    ]);
    expect(csv).toContain(",1,messages/inbox/t/photos/a.jpg");
  });

  it("writes an empty date for a message with no timestamp", () => {
    const csv = conversationCsv([{ ...message(), timestampMs: null }]);
    expect(csv.split("\r\n")[1]?.startsWith(",")).toBe(true);
  });
});

describe("csvFilename", () => {
  const now = new Date(Date.UTC(2024, 4, 1));

  it("uses the thread folder and the date", () => {
    expect(csvFilename("thread-1", now)).toBe("thread-1-2024-05-01.csv");
  });

  it("removes slashes and traversal", () => {
    const name = csvFilename("../../inbox/thread-1", now);
    expect(name).not.toContain("/");
    expect(name).not.toContain("\\");
    expect(name).not.toContain("..");
    expect(name).toBe("inbox-thread-1-2024-05-01.csv");
  });

  it("falls back when the folder sanitises to nothing", () => {
    expect(csvFilename("///", now)).toBe("conversation-2024-05-01.csv");
  });
});
