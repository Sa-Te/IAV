import type { TagListView as TagListViewData } from "@instavault/core";
import type { JSX } from "react";

import { pluralCount } from "../categories/counts.js";
import { RawDisclosure } from "../categories/RawDisclosure.js";
import { State } from "../ui/State.js";

/**
 * `following_hashtags`: a list of topics (docs/T4-DESIGN.md §7). A tag is not a
 * person, so it gets neither initials nor a card. The link is the export's own
 * tag-page URL; the app never fetches it.
 */

function dateLabel(timestamp: number): { text: string; iso: string } {
  const date = new Date(timestamp * 1000);
  return {
    text: date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
    iso: date.toISOString(),
  };
}

export function TagListView({ view, raw }: { view: TagListViewData; raw: unknown }): JSX.Element {
  return (
    <div className="tag-view">
      <p className="settings-summary">{pluralCount(view.total, "hashtag")}</p>

      {view.total === 0 ? (
        <State kind="empty" message="This category is in this export but holds no hashtags." />
      ) : (
        <ul className="tag-list">
          {view.tags.map((tag, index) => {
            const date = tag.timestamp === null ? null : dateLabel(tag.timestamp);
            return (
              <li className="tag-item" key={`${tag.tag}-${index}`}>
                {tag.url === null ? (
                  <span className="tag-name">#{tag.tag}</span>
                ) : (
                  <a
                    className="tag-name"
                    href={tag.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={tag.url}
                  >
                    #{tag.tag}
                  </a>
                )}
                {date !== null && (
                  <time className="tag-date" dateTime={date.iso}>
                    {date.text}
                  </time>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <RawDisclosure raw={raw} />
    </div>
  );
}
