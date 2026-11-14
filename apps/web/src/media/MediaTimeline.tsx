import { toMediaTimeline, type MediaItemView, type MediaTimelineItem } from "@instavault/core";
import { useEffect, useRef, type JSX } from "react";

import { pluralCount } from "../categories/counts.js";
import { MediaTile } from "./MediaTile.js";
import type { MediaSource } from "./useMediaUrl.js";

/**
 * The Timeline view: year → month, then larger tiles with caption/date. The
 * grouping comes from `toMediaTimeline` in core, which calls the same
 * `groupByMonthAndYear` the event list uses. Undated items are a final group.
 */

/** Present only in selection mode. */
export interface TimelineSelection {
  readonly isSelected: (id: string) => boolean;
  readonly onToggle: (id: string, shiftKey: boolean) => void;
  /** A month, a year or the Undated group: all of it, or none of it. */
  readonly onSetMany: (ids: readonly string[], selected: boolean) => void;
}

function dateOf(item: MediaItemView): string | null {
  if (item.takenAt <= 0) return null;
  return new Date(item.takenAt * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * A group checkbox with a third state. The native `indeterminate` property is
 * what draws the dash; `aria-checked="mixed"` is what announces it. Both, because
 * neither substitutes for the other.
 */
function GroupCheck({
  label,
  ids,
  select,
}: {
  label: string;
  ids: readonly string[];
  select: TimelineSelection;
}): JSX.Element {
  const ref = useRef<HTMLInputElement | null>(null);
  const selected = ids.filter((id) => select.isSelected(id)).length;
  const all = ids.length > 0 && selected === ids.length;
  const some = selected > 0 && !all;

  useEffect(() => {
    if (ref.current !== null) ref.current.indeterminate = some;
  }, [some]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="group-check"
      checked={all}
      aria-checked={some ? "mixed" : all}
      aria-label={`Select every item in ${label}`}
      onChange={() => select.onSetMany(ids, !all)}
    />
  );
}

function Cards({
  items,
  source,
  onOpen,
  select,
}: {
  items: readonly MediaTimelineItem[];
  source: MediaSource;
  onOpen: (index: number) => void;
  select?: TimelineSelection | undefined;
}): JSX.Element {
  return (
    <ul className="timeline-items">
      {items.map(({ item, index }) => {
        const date = dateOf(item);
        return (
          <li className="timeline-item" key={`${item.category}:${item.id}:${index}`}>
            <MediaTile
              item={item}
              source={source}
              onOpen={() => onOpen(index)}
              select={
                select === undefined
                  ? undefined
                  : {
                      selected: select.isSelected(item.id),
                      onToggle: (shiftKey) => select.onToggle(item.id, shiftKey),
                    }
              }
            />
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
  select,
}: {
  items: readonly MediaItemView[];
  source: MediaSource;
  onOpen: (index: number) => void;
  select?: TimelineSelection | undefined;
}): JSX.Element {
  const timeline = toMediaTimeline(items);
  const idsOf = (entries: readonly MediaTimelineItem[]): readonly string[] =>
    entries.map((entry) => entry.item.id);

  return (
    <div className="timeline">
      {timeline.years.map((year) => {
        const yearIds = year.months.flatMap((month) => idsOf(month.items));
        return (
          <section className="timeline-year" key={year.key}>
            <h2 className="timeline-year-heading">
              {select === undefined ? (
                year.label
              ) : (
                <label className="group-label">
                  <GroupCheck label={year.label} ids={yearIds} select={select} />
                  {year.label}
                </label>
              )}
            </h2>
            {year.months.map((month) => {
              const monthIds = idsOf(month.items);
              return (
                <section className="timeline-month" key={month.key}>
                  <h3 className="timeline-month-heading">
                    {select === undefined ? (
                      month.label
                    ) : (
                      <label className="group-label">
                        <GroupCheck label={month.label} ids={monthIds} select={select} />
                        {month.label}
                      </label>
                    )}
                    <span className="timeline-count">
                      {pluralCount(month.items.length, "item")}
                    </span>
                  </h3>
                  <Cards items={month.items} source={source} onOpen={onOpen} select={select} />
                </section>
              );
            })}
          </section>
        );
      })}

      {timeline.undated.length > 0 && (
        <section className="timeline-year">
          <h2 className="timeline-year-heading">
            {select === undefined ? (
              "Undated"
            ) : (
              <label className="group-label">
                <GroupCheck label="Undated" ids={idsOf(timeline.undated)} select={select} />
                Undated
              </label>
            )}
          </h2>
          <Cards items={timeline.undated} source={source} onOpen={onOpen} select={select} />
        </section>
      )}
    </div>
  );
}
