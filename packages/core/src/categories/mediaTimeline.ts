import type { MediaItemView } from "../domain/media.js";
import { groupByMonthAndYear, type EventEntry } from "./eventListView.js";

/**
 * Media grouped for the Timeline view.
 *
 * This does not group anything itself: it adapts a `MediaItemView` to the one
 * field the group reader needs (`timestamp`) and calls `groupByMonthAndYear`, the
 * same function the event list uses (ADR 0015). The year level is forced on, so
 * the Timeline is always year → month.
 *
 * An item with `takenAt === 0` is undated (the four extensionless JPEGs and the
 * profile photo in the measured archive). It goes to `undated`; it is never
 * dropped.
 */

export interface MediaTimelineItem {
  readonly item: MediaItemView;
  /** The item's index in the list the gallery opened. */
  readonly index: number;
}

export interface MediaTimelineMonth {
  readonly key: string;
  readonly label: string;
  readonly items: readonly MediaTimelineItem[];
}

export interface MediaTimelineYear {
  readonly key: string;
  readonly label: string;
  readonly months: readonly MediaTimelineMonth[];
}

export interface MediaTimeline {
  readonly years: readonly MediaTimelineYear[];
  readonly undated: readonly MediaTimelineItem[];
  readonly total: number;
}

function eventEntry(item: MediaItemView, index: number): EventEntry {
  const timestamp = item.takenAt > 0 ? item.takenAt : null;
  return {
    ordinal: index,
    timestamp,
    date: timestamp === null ? null : new Date(timestamp * 1000).toLocaleString(),
    hero: null,
    url: null,
    shortcode: null,
    preview: null,
    fields: [],
  };
}

export function toMediaTimeline(items: readonly MediaItemView[]): MediaTimeline {
  const entries = items.map((item, index) => eventEntry(item, index));
  const grouping = groupByMonthAndYear(entries, { years: "always" });

  const years: MediaTimelineYear[] = grouping.years.map((year) => ({
    key: year.key,
    label: year.label,
    months: year.months.map((month) => {
      const monthItems: MediaTimelineItem[] = [];
      for (const day of month.days) {
        for (const entry of day.entries) {
          const item = items[entry.ordinal];
          if (item !== undefined) monthItems.push({ item, index: entry.ordinal });
        }
      }
      return { key: month.key, label: month.label, items: monthItems };
    }),
  }));

  const undated = items
    .map((item, index) => ({ item, index }))
    .filter((entry) => entry.item.takenAt <= 0);

  return { years, undated, total: items.length };
}
