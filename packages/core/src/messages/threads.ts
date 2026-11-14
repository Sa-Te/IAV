import type { CategorySource } from "../ingest/port.js";

/**
 * Message threads, in core.
 *
 * Identity is the **folder** a thread file sits in, never a field inside the JSON:
 * a thread's `thread_path` happens to agree with its path in both measured exports,
 * but a rename or a missing field must not merge two conversations. The folder name
 * alone is not enough either — `bee_1492831372116356` exists under both `inbox/` and
 * `message_requests/` in `archive-2/` — so the id carries the family too.
 *
 * The folder may hold more than one file (`message_1.json` + `message_2.json`), and
 * ingestion keeps every file, so a thread merges its own files' messages and sums
 * their counts.
 */

export type ThreadFolder = "inbox" | "message_requests";

export interface ThreadSummary {
  /** `<folder>/<parent folder>`; unique across both families. */
  readonly id: string;
  readonly folder: ThreadFolder;
  readonly participants: readonly string[];
  readonly messageCount: number;
  /** Epoch milliseconds, as the export writes them; null when there are no messages. */
  readonly newestTimestamp: number | null;
  readonly oldestTimestamp: number | null;
  readonly mediaCount: number;
  readonly hasTitle: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

interface Location {
  readonly family: ThreadFolder;
  readonly folder: string;
}

/** Nearest ancestor folder named `inbox` or `message_requests`, and the folder below it. */
export function locateThread(path: string): Location | null {
  const parts = path.split("/");
  parts.pop();
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const segment = parts[index];
    if (segment === "inbox" || segment === "message_requests") {
      const folder = parts[index + 1];
      return folder === undefined ? null : { family: segment, folder };
    }
  }
  return null;
}

function messagesOf(payload: unknown): readonly unknown[] {
  return isObject(payload) && Array.isArray(payload.messages) ? payload.messages : [];
}

function participantsOf(payload: unknown, into: string[]): void {
  if (!isObject(payload) || !Array.isArray(payload.participants)) return;
  for (const participant of payload.participants) {
    const name = isObject(participant) ? participant.name : undefined;
    if (typeof name === "string" && !into.includes(name)) into.push(name);
  }
}

function mediaOf(message: Record<string, unknown>): number {
  let count = 0;
  for (const key of ["photos", "videos", "audio_files", "gifs"]) {
    const value = message[key];
    if (Array.isArray(value)) count += value.length;
  }
  return count;
}

function summarise(id: string, location: Location, payloads: readonly unknown[]): ThreadSummary {
  const participants: string[] = [];
  let messageCount = 0;
  let mediaCount = 0;
  let newest: number | null = null;
  let oldest: number | null = null;
  let hasTitle = false;

  for (const payload of payloads) {
    participantsOf(payload, participants);
    if (isObject(payload) && typeof payload.title === "string" && payload.title.length > 0) {
      hasTitle = true;
    }

    for (const raw of messagesOf(payload)) {
      if (!isObject(raw)) continue;
      messageCount += 1;
      mediaCount += mediaOf(raw);

      const stamp = raw.timestamp_ms;
      if (typeof stamp === "number") {
        if (newest === null || stamp > newest) newest = stamp;
        if (oldest === null || stamp < oldest) oldest = stamp;
      }
    }
  }

  return {
    id,
    folder: location.family,
    participants,
    messageCount,
    newestTimestamp: newest,
    oldestTimestamp: oldest,
    mediaCount,
    hasTitle,
  };
}

interface Source {
  readonly path: string;
  readonly payload: unknown;
}

/**
 * Pair each contributing file with its payload. `data` is a list of payloads when
 * the files have different container kinds, and a concatenated list when they are
 * all lists (M8's additive merge), so `sources` decides how to read it.
 */
/**
 * The structural part of a category record the thread readers need. Keeping it
 * structural lets `entryCountForView` pass `{data, sources}` without inventing a
 * full record, and keeps every caller honest about what it actually reads.
 */
export interface ThreadRecord {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}

function sourcesOf(record: ThreadRecord): readonly Source[] {
  const sources = record.sources ?? [];
  if (sources.length <= 1) {
    const only = sources[0];
    return only === undefined ? [] : [{ path: only.path, payload: record.data }];
  }
  const payloads = Array.isArray(record.data) ? record.data : [record.data];
  return sources.map((source, index) => ({ path: source.path, payload: payloads[index] }));
}

/** One thread from the single file it lives in. */
export function toThreadSummary(record: ThreadRecord, sourcePath: string): ThreadSummary | null {
  const source = sourcesOf(record).find((candidate) => candidate.path === sourcePath);
  if (source === undefined) return null;
  const location = locateThread(sourcePath);
  if (location === null) return null;
  return summarise(`${location.family}/${location.folder}`, location, [source.payload]);
}

/** Every thread in a message category, one per folder, newest message first. */
export function toThreadSummaries(record: ThreadRecord): readonly ThreadSummary[] {
  const groups = new Map<string, { location: Location; payloads: unknown[] }>();

  for (const source of sourcesOf(record)) {
    const location = locateThread(source.path);
    if (location === null) continue;
    const id = `${location.family}/${location.folder}`;
    const group = groups.get(id) ?? { location, payloads: [] };
    group.payloads.push(source.payload);
    groups.set(id, group);
  }

  const summaries = [...groups.entries()].map(([id, group]) =>
    summarise(id, group.location, group.payloads),
  );
  return sortThreads(summaries);
}

/** Newest first; ties broken by id so the order never depends on Map insertion. */
export function sortThreads(threads: readonly ThreadSummary[]): readonly ThreadSummary[] {
  return [...threads].sort((a, b) => {
    const left = a.newestTimestamp ?? Number.NEGATIVE_INFINITY;
    const right = b.newestTimestamp ?? Number.NEGATIVE_INFINITY;
    if (left !== right) return right - left;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export interface ThreadAttachment {
  readonly uri: string;
  readonly kind: "photo" | "video" | "audio" | "gif";
}

export interface ThreadMessage {
  readonly sender: string;
  readonly timestampMs: number | null;
  readonly text: string;
  readonly attachments: readonly ThreadAttachment[];
}

const ATTACHMENT_KINDS: readonly (readonly [string, ThreadAttachment["kind"]])[] = [
  ["photos", "photo"],
  ["videos", "video"],
  ["audio_files", "audio"],
  ["gifs", "gif"],
];

/** One thread's messages, oldest first. Identity again comes from the folder. */
export function threadMessages(record: ThreadRecord, threadId: string): readonly ThreadMessage[] {
  const payloads = sourcesOf(record)
    .filter((source) => {
      const location = locateThread(source.path);
      return location !== null && `${location.family}/${location.folder}` === threadId;
    })
    .map((source) => source.payload);

  const messages: ThreadMessage[] = [];
  for (const payload of payloads) {
    for (const raw of messagesOf(payload)) {
      if (!isObject(raw)) continue;
      const attachments: ThreadAttachment[] = [];
      for (const [key, kind] of ATTACHMENT_KINDS) {
        const list = raw[key];
        if (!Array.isArray(list)) continue;
        for (const attachment of list) {
          if (isObject(attachment) && typeof attachment.uri === "string") {
            attachments.push({ uri: attachment.uri, kind });
          }
        }
      }
      messages.push({
        sender: typeof raw.sender_name === "string" ? raw.sender_name : "",
        timestampMs: typeof raw.timestamp_ms === "number" ? raw.timestamp_ms : null,
        text: typeof raw.content === "string" ? raw.content : "",
        attachments,
      });
    }
  }

  // Chronological, as a conversation is read. Stable for equal (or missing) stamps.
  return messages
    .map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const left = a.message.timestampMs ?? 0;
      const right = b.message.timestampMs ?? 0;
      return left === right ? a.index - b.index : left - right;
    })
    .map((entry) => entry.message);
}
