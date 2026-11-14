import { toMediaTimeline, type MediaItemView, type MediaTimelineItem } from "@instavault/core";
import type { JSX } from "react";

import { pluralCount } from "../categories/counts.js";
import { MediaTile } from "./MediaTile.js";
import type { MediaSource } from "./useMediaUrl.js";

/**
 * The Timeline view: year → month, then larger tiles with caption/date. The
 * grouping comes from `toMediaTimeline` in core, which calls the same
 * `groupByMonthAndYear` the event list uses. Undated items are a final group.
 */

function dateOf(item: MediaItemView): string | null {
  if (item.takenAt <= 0) return null;
  return new Date(item.takenAt * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Cards({
  items,
  source,
  onOpen,
}: {
  items: readonly MediaTimelineItem[];
  source: MediaSource;
  onOpen: (index: number) => void;
}): JSX.Element {
  return (
    <ul className="timeline-items">
      {items.map(({ item, index }) => {
        const date = dateOf(item);
        return (
          <li className="timeline-item" key={`${item.category}:${item.id}:${index}`}>
            <MediaTile item={item} source={source} onOpen={() => onOpen(index)} />
            {(item.caption.trim() !== "" || date !== null) && (
              <p className="timeline-meta">
                {item.caption.trim() !== "" && (
                  <span className="timeline-caption">{item.caption}</span>
                )}
                {date !== null && (
                  <time
                    className="timeline-date"
                    dateTime={new Date(item.takenAt * 1000).toISOString()}
                  >
                    {date}
                  </time>
                )}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function MediaTimeline({
  items,
  source,
  onOpen,
}: {
  items: readonly MediaItemView[];
  source: MediaSource;
  onOpen: (index: number) => void;
}): JSX.Element {
  const timeline = toMediaTimeline(items);

  return (
    <div className="timeline">
      {timeline.years.map((year) => (
        <section className="timeline-year" key={year.key}>
          <h2 className="timeline-year-heading">{year.label}</h2>
          {year.months.map((month) => (
            <section className="timeline-month" key={month.key}>
              <h3 className="timeline-month-heading">
                {month.label}
                <span className="timeline-count">{pluralCount(month.items.length, "item")}</span>
              </h3>
              <Cards items={month.items} source={source} onOpen={onOpen} />
            </section>
          ))}
        </section>
      ))}

      {timeline.undated.length > 0 && (
        <section className="timeline-year">
          <h2 className="timeline-year-heading">Undated</h2>
          <Cards items={timeline.undated} source={source} onOpen={onOpen} />
        </section>
      )}
    </div>
  );
}
