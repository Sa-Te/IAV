import type { CategorySource } from "../ingest/port.js";
import { entriesOf, payloadsOf } from "./entries.js";
import { localisedDate } from "./format.js";
import { labelsConsumedByPreview, previewOf, type EventPreview } from "./eventPreview.js";
import { labelItemsOf, type LabelItem } from "./labelValues.js";
import { nestedUrlOf } from "./nestedUrl.js";
import { toSettingField, type SettingField } from "./settingsView.js";

/**
 * A dated category record as the event/activity screen can render it.
 *
 * The role mapping is measured, not invented (docs/T2-DESIGN.md §3): the hero is
 * the first non-empty label in a fixed priority, the date is the entry timestamp
 * (or a label timestamp, or a `string_list_data` timestamp), and a URL is the
 * label the export itself calls `URL` (or any absolute URL value). A category
 * with no caption-like label gets no hero — the row is the plain field list.
 *
 * `null` means the record is not an event list and must keep its old view.
 */

export interface EventEntry {
  readonly ordinal: number;
  /** Unix seconds; null when the entry carries no date. */
  readonly timestamp: number | null;
  /** Localised date and time; null when `timestamp` is null. */
  readonly date: string | null;
  readonly hero: { readonly label: string; readonly text: string } | null;
  readonly url: string | null;
  readonly shortcode: string | null;
  /** A sticker or poll worth rendering as itself; null for every other row. */
  readonly preview: EventPreview | null;
  /** Remaining fields with content; empty and absent fields are omitted. */
  readonly fields: readonly SettingField[];
}

export interface EventDay {
  /** Local `YYYY-MM-DD`; also the sort key. */
  readonly key: string;
  readonly label: string;
  readonly entries: readonly EventEntry[];
}

export interface EventMonth {
  /** Local `YYYY-MM`; also the sort key. */
  readonly key: string;
  readonly label: string;
  readonly days: readonly EventDay[];
  readonly entryCount: number;
}

/** A fold above the month, used only for long spans (ADR 0015). */
export interface EventYear {
  /** `YYYY`; also the sort key. */
  readonly key: string;
  readonly label: string;
  readonly months: readonly EventMonth[];
  readonly monthCount: number;
  readonly entryCount: number;
}

export interface EventListView {
  readonly kind: "event-list";
  /** Every dated month, newest first. The renderer's only list when `showYears` is false. */
  readonly months: readonly EventMonth[];
  /** Populated only when `showYears`: an empty array means the year level is off. */
  readonly years: readonly EventYear[];
  readonly showYears: boolean;
  readonly undated: readonly EventEntry[];
  readonly total: number;
  readonly hasTimestamps: boolean;
}

/**
 * The measured span that turns the year level on (ADR 0015). Below 25 months the
 * extra level costs a click and buys nothing: the month list is already short
 * enough to scan.
 */
export const YEAR_LEVEL_MIN_MONTHS = 25;

/**
 * The measured hero priority. `Question` and `Comment` joined it in M22 after T3
 * was measured: a question's text and a comment's text are the row's subject in
 * exactly the way a caption is, and nothing else in those categories says what the
 * row is about (docs/T3-DESIGN.md §3). `Type` stays absent — it names the kind of
 * event, not the event, and using it would be an interpretation.
 */
const HERO_PRIORITY = [
  "Caption",
  "Title",
  "Question",
  "Comment",
  "Name",
  "Search",
  "Changed",
  "Activation Type",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textOfItem(item: LabelItem): string | null {
  return typeof item.value === "string" && item.value.trim() !== "" ? item.value : null;
}

function heroOf(items: readonly LabelItem[]): LabelItem | null {
  for (const label of HERO_PRIORITY) {
    const item = items.find(
      (candidate) => candidate.label === label && textOfItem(candidate) !== null,
    );
    if (item !== undefined) return item;
  }
  return null;
}

function urlValue(item: LabelItem): string | undefined {
  return typeof item.value === "string" && /^https?:\/\//.test(item.value) ? item.value : undefined;
}

function urlOf(items: readonly LabelItem[]): { url: string; item: LabelItem } | null {
  const named = items.find(
    (item) => item.label === "URL" && (item.href ?? urlValue(item)) !== undefined,
  );
  const candidate = named ?? items.find((item) => (item.href ?? urlValue(item)) !== undefined);
  if (candidate === undefined) return null;
  const url = candidate.href ?? urlValue(candidate);
  return url === undefined ? null : { url, item: candidate };
}

/** Instagram post/reel/tv URLs only; a profile or website URL has no shortcode. */
export function shortcodeOf(url: string): string | null {
  const match =
    /\/p\/([^/?#]+)/.exec(url) ?? /\/reel\/([^/?#]+)/.exec(url) ?? /\/tv\/([^/?#]+)/.exec(url);
  return match?.[1] ?? null;
}

function hasContent(field: SettingField): boolean {
  switch (field.value.kind) {
    case "absent":
      return false;
    case "text":
      return field.value.text !== "";
    case "timestamp":
      return true;
    case "list":
      return field.value.fields.length > 0;
  }
}

function dateOf(
  raw: Record<string, unknown>,
  items: readonly LabelItem[],
): { timestamp: number | null; dateItem: LabelItem | null } {
  const entryTimestamp = typeof raw.timestamp === "number" ? raw.timestamp : null;
  const firstLabelTimestamp = items.find((item) => item.timestamp !== undefined) ?? null;

  if (entryTimestamp !== null) {
    // Exclude a label timestamp only when it is the same fact as the entry
    // timestamp; a different one (e.g. "Update time") stays a field.
    const duplicate =
      firstLabelTimestamp?.timestamp === entryTimestamp ? firstLabelTimestamp : null;
    return { timestamp: entryTimestamp, dateItem: duplicate };
  }
  if (firstLabelTimestamp?.timestamp !== undefined) {
    return { timestamp: firstLabelTimestamp.timestamp, dateItem: firstLabelTimestamp };
  }

  const list = Array.isArray(raw.string_list_data) ? raw.string_list_data : [];
  for (const item of list) {
    if (isObject(item) && typeof item.timestamp === "number") {
      return { timestamp: item.timestamp, dateItem: null };
    }
  }
  return { timestamp: null, dateItem: null };
}

function entryFrom(raw: Record<string, unknown>, ordinal: number): EventEntry | null {
  const items = labelItemsOf(raw) ?? [];
  const list = Array.isArray(raw.string_list_data) ? raw.string_list_data : [];
  const firstList = list.find(isObject);
  const listTimestamp =
    firstList !== undefined && typeof firstList.timestamp === "number" ? firstList.timestamp : null;
  const listHref =
    firstList !== undefined &&
    typeof firstList.href === "string" &&
    /^https?:\/\//.test(firstList.href)
      ? firstList.href
      : null;

  const title = typeof raw.title === "string" && raw.title.trim() !== "" ? raw.title : null;
  if (items.length === 0 && title === null && list.length === 0) return null;

  const heroItem = heroOf(items);
  const heroText = heroItem === null ? null : textOfItem(heroItem);
  let hero: EventEntry["hero"] = null;
  if (heroItem !== null && heroText !== null) {
    hero = { label: heroItem.label, text: heroText };
  } else if (items.length === 0 && title !== null) {
    // The two `string_list_data` categories have no label layer; their own title
    // is the only honest hero.
    hero = { label: "title", text: title };
  }

  const urlMatch = urlOf(items);
  const url = urlMatch?.url ?? listHref ?? nestedUrlOf(raw);
  const urlItem = urlMatch?.item ?? null;

  const { timestamp: dated, dateItem } = dateOf(raw, items);
  const timestamp = dated ?? listTimestamp;

  const preview = previewOf(items);
  const consumed = labelsConsumedByPreview(preview, items);

  const fields = items
    .filter(
      (item) =>
        !consumed.has(item.label) &&
        item.label !== heroItem?.label &&
        item.label !== urlItem?.label &&
        item.label !== dateItem?.label,
    )
    .map(toSettingField)
    .filter(hasContent);

  return {
    ordinal,
    timestamp,
    date: timestamp === null ? null : localisedDate(timestamp),
    hero,
    url,
    shortcode: url === null ? null : shortcodeOf(url),
    preview,
    fields,
  };
}

function groupByMonth(entries: readonly EventEntry[]): readonly EventMonth[] {
  const months = new Map<
    string,
    { label: string; days: Map<string, { label: string; entries: EventEntry[] }> }
  >();

  for (const entry of entries) {
    if (entry.timestamp === null) continue;
    const date = new Date(entry.timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const monthKey = `${year}-${month}`;
    const dayKey = `${monthKey}-${day}`;

    const monthEntry = months.get(monthKey) ?? {
      label: date.toLocaleString(undefined, { month: "long", year: "numeric" }),
      days: new Map<string, { label: string; entries: EventEntry[] }>(),
    };
    const dayEntry = monthEntry.days.get(dayKey) ?? {
      label: date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      entries: [],
    };
    dayEntry.entries.push(entry);
    monthEntry.days.set(dayKey, dayEntry);
    months.set(monthKey, monthEntry);
  }

  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, month]) => ({
      key,
      label: month.label,
      entryCount: [...month.days.values()].reduce((sum, day) => sum + day.entries.length, 0),
      days: [...month.days.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([dayKey, day]) => ({
          key: dayKey,
          label: day.label,
          entries: day.entries.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
        })),
    }));
}

export interface EventGrouping {
  /** Newest first; the year level's input and the flat list both read this. */
  readonly months: readonly EventMonth[];
  /** Empty unless `showYears`. */
  readonly years: readonly EventYear[];
  /** Inclusive months between the oldest and newest entry; 0 when undated. */
  readonly spanMonths: number;
  readonly showYears: boolean;
}

/** Month index arithmetic on `YYYY-MM`, so no Date object decides the span. */
function monthsBetween(oldest: string, newest: string): number {
  const year = (key: string): number => Number(key.slice(0, 4));
  const month = (key: string): number => Number(key.slice(5, 7));
  return (year(newest) - year(oldest)) * 12 + (month(newest) - month(oldest)) + 1;
}

/**
 * Year → month → day, from the dated entries.
 *
 * The fold above the month is a response to measured span, not to entry count
 * (ADR 0015): 42,197 entries across 121 months is the case that needs it, while
 * 7,849 entries in one month does not. `spanMonths` counts empty months inside the
 * range — a person scrolling from 2015 to 2026 wants the years, not a count of
 * months that happen to hold an entry.
 */
export function groupByMonthAndYear(entries: readonly EventEntry[]): EventGrouping {
  const months = groupByMonth(entries);
  const oldest = months[months.length - 1];
  const newest = months[0];
  const spanMonths =
    oldest === undefined || newest === undefined ? 0 : monthsBetween(oldest.key, newest.key);

  if (spanMonths < YEAR_LEVEL_MIN_MONTHS) {
    return { months, years: [], spanMonths, showYears: false };
  }

  const byYear = new Map<string, EventMonth[]>();
  for (const month of months) {
    const key = month.key.slice(0, 4);
    const list = byYear.get(key) ?? [];
    list.push(month);
    byYear.set(key, list);
  }

  const years = [...byYear.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, yearMonths]) => ({
      key,
      label: key,
      months: yearMonths,
      monthCount: yearMonths.length,
      entryCount: yearMonths.reduce((sum, month) => sum + month.entryCount, 0),
    }));

  return { months, years, spanMonths, showYears: true };
}

export function toEventListView(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): EventListView | null {
  const entries: EventEntry[] = [];

  for (const payload of payloadsOf(record)) {
    const raws = entriesOf(payload);
    if (raws === null) return null;
    for (const raw of raws) {
      if (!isObject(raw)) return null;
      const entry = entryFrom(raw, entries.length + 1);
      if (entry === null) return null;
      entries.push(entry);
    }
  }

  const dated = entries.filter((entry) => entry.timestamp !== null);
  const grouping = groupByMonthAndYear(dated);
  return {
    kind: "event-list",
    months: grouping.months,
    years: grouping.years,
    showYears: grouping.showYears,
    undated: entries.filter((entry) => entry.timestamp === null),
    total: entries.length,
    hasTimestamps: dated.length > 0,
  };
}
