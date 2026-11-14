/**
 * Full-text search over message bodies, in memory, on the device (D3).
 *
 * The index is built once per archive from the same `threadMessages` the
 * conversation view renders, so a hit's `messageIndex` is the index in that
 * ordered list. There is no persistence and no worker: `archive-2/` measures
 * 33,703 messages, and the build/query numbers are reported with the feature.
 */

export interface SearchableThread {
  readonly id: string;
  /** Message bodies in conversation order; index 0 is the first message shown. */
  readonly messages: readonly string[];
}

export interface SearchHit {
  readonly threadId: string;
  readonly messageIndex: number;
  /** A bounded window around the first match, never the whole message. */
  readonly snippet: string;
  /** The matched substring as it appears in the message. */
  readonly matched: string;
}

interface IndexedMessage {
  readonly threadId: string;
  readonly messageIndex: number;
  readonly original: string;
  readonly normalized: string;
  /** For each normalized character, the index of the original character. */
  readonly map: readonly number[];
}

export interface SearchIndex {
  readonly messages: readonly IndexedMessage[];
}

const SNIPPET_BEFORE = 60;
const SNIPPET_AFTER = 90;

function isDiacritic(char: string): boolean {
  return /\p{Diacritic}/u.test(char);
}

/**
 * Lowercase, strip diacritics and collapse whitespace, keeping a character map
 * back to the original so a snippet is quoted, not normalized prose.
 */
function normalise(text: string): { text: string; map: number[] } {
  let out = "";
  const map: number[] = [];
  let lastSpace = true;

  for (let index = 0; index < text.length;) {
    const code = text.codePointAt(index);
    if (code === undefined) break;
    const char = String.fromCodePoint(code);

    // Normalise per code point; a decomposition can produce several characters,
    // and every one of them points back to this source character.
    for (const piece of char.normalize("NFD")) {
      if (isDiacritic(piece)) continue;
      const lower = piece.toLowerCase();
      for (const normalized of lower) {
        if (/\s/.test(normalized)) {
          if (!lastSpace) {
            out += " ";
            map.push(index);
            lastSpace = true;
          }
        } else {
          out += normalized;
          map.push(index);
          lastSpace = false;
        }
      }
    }
    index += char.length;
  }

  return { text: out.trim(), map };
}

export function normaliseQuery(query: string): string {
  return normalise(query).text;
}

export function buildIndex(threads: readonly SearchableThread[]): SearchIndex {
  const messages: IndexedMessage[] = [];

  for (const thread of threads) {
    thread.messages.forEach((message, messageIndex) => {
      const { text, map } = normalise(message);
      if (text === "") return;
      messages.push({
        threadId: thread.id,
        messageIndex,
        original: message,
        normalized: text,
        map,
      });
    });
  }

  return { messages };
}

function snippetAround(message: IndexedMessage, start: number, end: number): string {
  const originalStart = message.map[start] ?? 0;
  const lastOriginal = message.map[end - 1] ?? originalStart;
  const originalEnd = lastOriginal + 1;

  const from = Math.max(0, originalStart - SNIPPET_BEFORE);
  const to = Math.min(message.original.length, originalEnd + SNIPPET_AFTER);
  const body = message.original.slice(from, to).trim();
  return `${from > 0 ? "…" : ""}${body}${to < message.original.length ? "…" : ""}`;
}

/**
 * Case-, diacritic- and whitespace-insensitive. A query shorter than two
 * characters returns nothing rather than every message; a miss is an empty list,
 * never an error. At most one hit per message, and `limit` hits in total.
 */
export function search(index: SearchIndex, query: string, limit = 50): readonly SearchHit[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const needle = normaliseQuery(query);
  if (needle.length < 2) return [];

  const hits: SearchHit[] = [];
  for (const message of index.messages) {
    const start = message.normalized.indexOf(needle);
    if (start < 0) continue;
    const end = start + needle.length;
    const originalStart = message.map[start] ?? 0;
    const originalEnd = (message.map[end - 1] ?? originalStart) + 1;

    hits.push({
      threadId: message.threadId,
      messageIndex: message.messageIndex,
      snippet: snippetAround(message, start, end),
      matched: message.original.slice(originalStart, originalEnd),
    });
    if (hits.length >= limit) break;
  }
  return hits;
}
