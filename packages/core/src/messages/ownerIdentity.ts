import type { CategorySource } from "../ingest/port.js";

/**
 * Who is the account holder, as the export names them.
 *
 * `personal_information` stores one `profile_user` with `string_map_data`; the
 * measured owner has an empty `Name` and a non-empty `Username`. Either is enough
 * for a match; both are kept so the caller can compare against a sender_name.
 */

export interface OwnerIdentity {
  readonly name: string | null;
  readonly username: string | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toOwnerIdentity(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): OwnerIdentity | null {
  const data = record.data;
  if (!isObject(data) || !Array.isArray(data.profile_user)) return null;
  const user = data.profile_user.find(isObject);
  if (user === undefined || !isObject(user.string_map_data)) return null;
  const map = user.string_map_data;
  const name = isObject(map.Name) ? text(map.Name.value) : null;
  const username = isObject(map.Username) ? text(map.Username.value) : null;
  if (name === null && username === null) return null;
  return { name, username };
}

function matches(sender: string, owner: OwnerIdentity): boolean {
  const value = sender.trim().toLowerCase();
  if (value === "") return false;
  return (
    (owner.name !== null && value === owner.name.toLowerCase()) ||
    (owner.username !== null && value === owner.username.toLowerCase())
  );
}

/**
 * Exactly one distinct sender_name identifies the owner; zero or several is not
 * an identification. Never guessed by frequency or position (D3).
 */
export function identifyOwnerSender(
  senders: readonly string[],
  owner: OwnerIdentity | null,
): string | null {
  if (owner === null) return null;
  const matchesList = [...new Set(senders)].filter((sender) => matches(sender, owner));
  return matchesList.length === 1 ? (matchesList[0] ?? null) : null;
}
