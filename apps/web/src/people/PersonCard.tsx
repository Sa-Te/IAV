import type { Person } from "@instavault/core";
import type { JSX } from "react";

/**
 * One person, as the person screen shows them (M23, docs/T4-DESIGN.md §3).
 *
 * There are no profile images in the export (D4): the initials are a text glyph on
 * a token surface, not a generated image and not a hash-to-colour. The link is the
 * export's own URL — the app never fetches it and never constructs one.
 */

/** First letters of the first and last word; one letter for a single word. */
export function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word !== "");
  if (words.length === 0) return "?";
  const first = [...(words[0] ?? "")][0] ?? "";
  const last = words.length > 1 ? ([...(words[words.length - 1] ?? "")][0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

function dateLabels(timestamp: number): { text: string; iso: string } {
  const date = new Date(timestamp * 1000);
  return {
    text: date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
    iso: date.toISOString(),
  };
}

export function PersonCard({ person }: { person: Person }): JSX.Element {
  const username = person.username;
  const canLink = username !== null && username !== "" && person.profileUrl !== null;
  const showUsername =
    username !== null &&
    username !== "" &&
    username.toLowerCase() !== person.displayName.toLowerCase();
  const date = person.timestamp === null ? null : dateLabels(person.timestamp);

  return (
    <article className="person-card">
      <span className="person-initials" aria-hidden="true">
        {initialsOf(person.displayName)}
      </span>
      <div className="person-body">
        <p className="person-name">{person.displayName}</p>
        {showUsername && <p className="person-username">@{username}</p>}
        {(date !== null || canLink) && (
          <p className="person-meta">
            {date !== null && <time dateTime={date.iso}>{date.text}</time>}
            {canLink && (
              <a
                className="person-link"
                href={person.profileUrl ?? ""}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={person.profileUrl ?? ""}
              >
                Profile
              </a>
            )}
          </p>
        )}
      </div>
    </article>
  );
}
