import type { CategorySource } from "../ingest/port.js";
import { entriesOf, payloadsOf } from "./entries.js";

/**
 * The person screen's pure half (M23, docs/T4-DESIGN.md §3).
 *
 * T4's thirteen rows are not one shape. The measured mapping is:
 *
 * - label/value interactions (`Name`, `Username`, `URL`): the display name and
 *   username are labels; the `URL` label is **not** the profile URL (0 of 87
 *   Instagram profiles in `archive-2/`), so it is not shown as one;
 * - follower rows: the username lives in `string_list_data[0].value` and `title`
 *   is empty;
 * - following rows: the username is `title` and the list item has no `value`;
 * - Threads follow requests: `string_list_data[0].value` plus a threads.com href.
 *
 * A hashtag entry is structurally identical to a follower entry; only the
 * measured category assignment tells them apart. That is why the screen list is
 * data here and why a hashtag record takes the non-person branch.
 *
 * `null` means "this is not a person" and the caller keeps the existing screen.
 * The mapper never invents a username, a display name or a profile URL.
 */

export interface Person {
  /** Never empty; falls back to the username when the export has no name. */
  readonly displayName: string;
  /** The export's username, or null if the entry has none. */
  readonly username: string | null;
  /** The export's own profile URL; null when the file carries none. */
  readonly profileUrl: string | null;
  /** Unix seconds; null when the entry carries no date. */
  readonly timestamp: number | null;
  /**
   * The original entry, only kept for an unmatched connection (one with no
   * usable username). Not stored and never rendered as a field; it exists so the
   * diff can keep the record instead of dropping it (M25).
   */
  readonly raw?: unknown;
}

export interface PersonYear {
  /** `YYYY`, also the sort key. */
  readonly key: string;
  readonly label: string;
  readonly people: readonly Person[];
}

export interface PeopleByYear {
  /** Newest year first; alphabetical inside a year. */
  readonly years: readonly PersonYear[];
  readonly undated: readonly Person[];
}

export interface PersonListView extends PeopleByYear {
  readonly kind: "people";
  /** Ordered flat list for the paged renderer: dated newest first, undated last. */
  readonly people: readonly Person[];
  readonly total: number;
  readonly hasDates: boolean;
}

/**
 * The twelve measured person rows (docs/T4-DESIGN.md §7). The two rows that do
 * not appear are `following_hashtags` (a tag is not a person) and
 * `synced_contacts` (no username, no profile URL; the contact value is the
 * content).
 */
export const PERSON_CATEGORY_IDS: readonly string[] = [
  "removed_suggestions",
  "restricted_profiles",
  "hide_story_from",
  "close_friends",
  "recent_follow_requests",
  "follow_requests_you've_received",
  "threads_follow_requests_received",
  "recently_unfollowed_profiles",
  "blocked_profiles",
  "pending_follow_requests",
  "followers",
  "following",
];

const PERSON_IDS = new Set(PERSON_CATEGORY_IDS);

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function timestampOf(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * A profile URL the export itself carries. The `URL` label is only accepted when
 * its path is the person's username; a personal website is not a profile and is
 * left in the raw JSON (docs/T4-DESIGN.md §4).
 */
function profileUrlOf(raw: unknown, username: string): string | null {
  if (typeof raw !== "string" || raw === "") return null;
  // No DOM `URL` here: core runs under node with no DOM lib (AGENTS §2).
  const match = /^https?:\/\/([^/?#]+)(\/[^?#]*)?/i.exec(raw);
  if (match === null) return null;
  const host = (match[1] ?? "").toLowerCase();
  const segments = (match[2] ?? "/")
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment) => {
      try {
        return decodeURIComponent(segment).toLowerCase();
      } catch {
        return segment.toLowerCase();
      }
    });
  const name = username.toLowerCase();

  if (host === "instagram.com" || host === "www.instagram.com") {
    if (segments.length === 1 && segments[0] === name) return raw;
    if (segments.length === 2 && segments[0] === "_u" && segments[1] === name) return raw;
    return null;
  }
  if (/(^|\.)threads\.(com|net)$/.test(host)) {
    return segments.length === 1 && segments[0] === name ? raw : null;
  }
  return null;
}

function fromLabelValues(entry: Record<string, unknown>): Person | null {
  const items = Array.isArray(entry.label_values) ? entry.label_values : [];
  const values = new Map<string, string>();
  for (const item of items) {
    if (!isObject(item) || typeof item.label !== "string") continue;
    const value = text(item.value);
    if (value !== "") values.set(item.label, value);
  }

  const username = values.get("Username") ?? "";
  if (username === "") return null;
  const displayName = values.get("Name") ?? username;

  return {
    displayName,
    username,
    profileUrl: profileUrlOf(values.get("URL"), username),
    timestamp: timestampOf(entry.timestamp),
  };
}

function fromStringList(entry: Record<string, unknown>): Person | null {
  const list = Array.isArray(entry.string_list_data) ? entry.string_list_data : [];
  const first = list.find((item) => isObject(item));
  const item = isObject(first) ? first : {};

  const value = text(item.value);
  const title = text(entry.title);
  const username = value !== "" ? value : title;
  if (username === "") return null;

  return {
    displayName: title !== "" ? title : username,
    username,
    profileUrl: profileUrlOf(item.href, username),
    timestamp: timestampOf(item.timestamp) ?? timestampOf(entry.timestamp),
  };
}

/** One entry, or null when it does not describe a person. */
export function toPerson(entry: unknown): Person | null {
  if (!isObject(entry)) return null;
  if (Array.isArray(entry.label_values)) return fromLabelValues(entry);
  if (Array.isArray(entry.string_list_data)) return fromStringList(entry);
  return null;
}

function yearOf(person: Person): number | null {
  if (person.timestamp === null) return null;
  const date = new Date(person.timestamp * 1000);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear();
}

/**
 * Code-point comparison, not `localeCompare`: the order is part of a tested
 * contract and must not change with the machine's locale.
 */
function compareText(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function comparePeople(a: Person, b: Person): number {
  return (
    compareText(a.displayName, b.displayName) || compareText(a.username ?? "", b.username ?? "")
  );
}

/**
 * Split an already-ordered list into year sections. Exported because the paged
 * renderer groups the visible slice, while this module orders the whole list.
 */
export function groupPeopleByYear(people: readonly Person[]): PeopleByYear {
  const byYear = new Map<number, Person[]>();
  const undated: Person[] = [];

  for (const person of people) {
    const year = yearOf(person);
    if (year === null) {
      undated.push(person);
      continue;
    }
    const bucket = byYear.get(year) ?? [];
    bucket.push(person);
    byYear.set(year, bucket);
  }

  const years = [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, bucket]) => ({
      key: String(year),
      label: String(year),
      people: [...bucket].sort(comparePeople),
    }));

  return { years, undated: [...undated].sort(comparePeople) };
}

/** Order an arbitrary person list the way the person screen expects. */
export function toPersonList(people: readonly Person[]): PersonListView {
  const dated = people
    .filter((person) => person.timestamp !== null)
    .sort((a, b) => {
      const yearA = yearOf(a) ?? 0;
      const yearB = yearOf(b) ?? 0;
      return yearB - yearA || comparePeople(a, b);
    });
  const undated = people.filter((person) => person.timestamp === null).sort(comparePeople);
  const ordered = [...dated, ...undated];
  const { years, undated: undatedOut } = groupPeopleByYear(ordered);

  return {
    kind: "people",
    years,
    undated: undatedOut,
    people: ordered,
    total: ordered.length,
    hasDates: dated.length > 0,
  };
}

/**
 * The person list for a T4 record, or null when the category was not measured as
 * one (a hashtag list, a contact list) or the record holds no person at all.
 */
export function toPersonView(record: {
  readonly id: string;
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): PersonListView | null {
  if (!PERSON_IDS.has(record.id)) return null;

  // `payloadsOf` is what every multi-file reader uses. A fresh import stores the
  // two follow-request apps as two rows, but an archive imported before ADR 0018
  // still holds one merged record: payload 1 is the connections array, payload 2
  // is the Threads wrapper. Reading both keeps that stored archive on the person
  // screen instead of silently falling back to the tree.
  const people: Person[] = [];
  for (const payload of payloadsOf(record)) {
    const entries = entriesOf(payload);
    if (entries === null) continue;
    for (const entry of entries) {
      const person = toPerson(entry);
      if (person !== null) people.push(person);
    }
  }
  if (people.length === 0) return null;

  return toPersonList(people);
}
