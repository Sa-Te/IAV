import { mediaProvenance, type MediaItemView } from "@instavault/core";
import type { JSX } from "react";

/**
 * "from messages · inbox · <thread>" for a message attachment, with a link to the
 * conversation (D5, ADR 0021). The provenance is derived from the archive path;
 * no stored field and no invented thread name. A category tile returns nothing.
 */

function threadHref(family: "inbox" | "message_requests", threadFolder: string): string {
  const categoryId = family === "inbox" ? "messages_inbox" : "messages_requests";
  return `/categories/${categoryId}#${encodeURIComponent(`${family}/${threadFolder}`)}`;
}

export function Provenance({ item }: { item: MediaItemView }): JSX.Element | null {
  const provenance = mediaProvenance(item.id);
  if (provenance.kind !== "message") return null;

  return (
    <p className="media-provenance">
      from messages · {provenance.family} ·{" "}
      <span className="media-thread">{provenance.threadFolder}</span> ·{" "}
      <a href={threadHref(provenance.family, provenance.threadFolder)}>Open thread</a>
    </p>
  );
}
