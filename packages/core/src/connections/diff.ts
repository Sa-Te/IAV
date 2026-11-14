import type { CategorySource } from "../ingest/port.js";
import { entriesOf, payloadsOf } from "../categories/entries.js";
import { toPerson, type Person } from "../categories/personView.js";

/**
 * Followers ∩ following, by username (D4).
 *
 * A person is the same person when the export's username is the same,
 * case-insensitively. A record with no usable username is not comparable: it goes
 * to `unmatched` with its raw entry and into none of the three sets. It is never
 * guessed from a display name, a position or a count.
 */

export interface ConnectionRecord {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}

export interface ConnectionDiff {
  /** All entries on each side, including the unmatched ones. */
  readonly followerTotal: number;
  readonly followingTotal: number;
  readonly mutual: readonly Person[];
  readonly followOnly: readonly Person[];
  readonly followerOnly: readonly Person[];
  readonly unmatched: readonly Person[];
}

interface ReadConnections {
  readonly people: readonly Person[];
  readonly unmatched: readonly Person[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function timestampOf(entry: Record<string, unknown>): number | null {
  if (typeof entry.timestamp === "number" && entry.timestamp > 0) return entry.timestamp;
  const list = Array.isArray(entry.string_list_data) ? entry.string_list_data : [];
  for (const item of list) {
    if (isObject(item) && typeof item.timestamp === "number" && item.timestamp > 0) {
      return item.timestamp;
    }
  }
  return null;
}

function fallbackName(entry: Record<string, unknown>): string {
  const title = text(entry.title);
  if (title !== "") return title;
  return "Unnamed connection";
}

function readConnections(record: ConnectionRecord): ReadConnections {
  const people: Person[] = [];
  const unmatched: Person[] = [];

  for (const payload of payloadsOf(record)) {
    const entries = entriesOf(payload);
    if (entries === null) continue;
    for (const entry of entries) {
      if (!isObject(entry)) continue;
      const person = toPerson(entry);
      if (person === null || person.username === null || person.username === "") {
        unmatched.push({
          displayName: person?.displayName ?? fallbackName(entry),
          username: null,
          profileUrl: null,
          timestamp: timestampOf(entry),
          raw: entry,
        });
        continue;
      }
      people.push({ ...person, username: person.username });
    }
  }

  return { people, unmatched };
}

function byUsername(people: readonly Person[]): Map<string, Person> {
  const map = new Map<string, Person>();
  for (const person of people) {
    if (person.username === null) continue;
    const key = person.username.toLowerCase();
    if (!map.has(key)) map.set(key, person);
  }
  return map;
}

export function diffConnections(
  followers: ConnectionRecord,
  following: ConnectionRecord,
): ConnectionDiff {
  const followerSide = readConnections(followers);
  const followingSide = readConnections(following);
  const followerMap = byUsername(followerSide.people);
  const followingMap = byUsername(followingSide.people);

  const mutual = followerSide.people.filter((person) => {
    const key = person.username?.toLowerCase();
    return key !== undefined && followingMap.has(key);
  });
  const followerOnly = followerSide.people.filter((person) => {
    const key = person.username?.toLowerCase();
    return key === undefined || !followingMap.has(key);
  });
  const followOnly = followingSide.people.filter((person) => {
    const key = person.username?.toLowerCase();
    return key === undefined || !followerMap.has(key);
  });

  return {
    followerTotal: followerSide.people.length + followerSide.unmatched.length,
    followingTotal: followingSide.people.length + followingSide.unmatched.length,
    mutual,
    followOnly,
    followerOnly,
    unmatched: [...followerSide.unmatched, ...followingSide.unmatched],
  };
}
