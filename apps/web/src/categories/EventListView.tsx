import type {
  EventDay,
  EventEntry,
  EventListView as EventListViewData,
  EventMonth,
  EventYear,
} from "@instavault/core";
import { useState, type JSX } from "react";

import { State } from "../ui/State.js";
import { pluralCount } from "./counts.js";
import { RawDisclosure } from "./RawDisclosure.js";
import { Fields } from "./settingsFields.js";

/**
 * The T2 event/activity screen (docs/T2-DESIGN.md §3).
 *
 * Month button → day heading → row. Only the newest month starts open, and a
 * collapsed month renders its button and nothing else: 7,849 entries never land
 * in the DOM at once. A day with more than 200 entries adds 200 at a time.
 *
 * The row's URL is a real link. The app never fetches it, and the image is not in
 * the export; the link only opens what the person chooses to open.
 */

/** A day renders at most this many rows at a time. */
export const DAY_PAGE = 200;

/** An expanded month shows at most this many days at a time. */
export const MONTH_DAYS = 7;

function PlainList({
  entries,
  heading,
}: {
  entries: readonly EventEntry[];
  heading: string | null;
}): JSX.Element {
  const [limit, setLimit] = useState(DAY_PAGE);
  const shown = entries.slice(0, limit);
  const remaining = entries.length - shown.length;

  return (
    <section className="event-day">
      {heading !== null && <h3 className="event-day-heading">{heading}</h3>}
      <ol className="event-rows">
        {shown.map((entry) => (
          <EntryRow key={entry.ordinal} entry={entry} />
        ))}
      </ol>
      {remaining > 0 && (
        <div className="event-more">
          <p role="status">
            Showing {shown.length} of {entries.length} entries.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => setLimit((value) => value + DAY_PAGE)}
          >
            Show {Math.min(DAY_PAGE, remaining)} more
          </button>
        </div>
      )}
    </section>
  );
}

function EntryRow({ entry }: { entry: EventEntry }): JSX.Element {
  return (
    <li className="event-row">
      {entry.date !== null && entry.timestamp !== null && (
        <time className="event-date" dateTime={new Date(entry.timestamp * 1000).toISOString()}>
          {entry.date}
        </time>
      )}
      {entry.hero !== null && <p className="event-hero">{entry.hero.text}</p>}
      {entry.url !== null && (
        <p className="event-link">
          <a
            href={entry.url}
            rel="noreferrer noopener"
            target="_blank"
            aria-label={entry.url}
            title={entry.url}
            className={entry.shortcode === null ? "settings-opaque" : undefined}
          >
            {entry.shortcode === null ? (
              entry.url
            ) : (
              <span className="event-shortcode">{entry.shortcode}</span>
            )}
          </a>
        </p>
      )}
      {entry.fields.length > 0 && <Fields fields={entry.fields} />}
    </li>
  );
}

function DaySection({ day }: { day: EventDay }): JSX.Element {
  const [limit, setLimit] = useState(DAY_PAGE);
  const shown = day.entries.slice(0, limit);
  const remaining = day.entries.length - shown.length;

  return (
    <section className="event-day">
      <h3 className="event-day-heading">{day.label}</h3>
      <ol className="event-rows">
        {shown.map((entry) => (
          <EntryRow key={entry.ordinal} entry={entry} />
        ))}
      </ol>
      {remaining > 0 && (
        <div className="event-more">
          <p role="status">
            Showing {shown.length} of {day.entries.length} entries.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => setLimit((value) => value + DAY_PAGE)}
          >
            Show {Math.min(DAY_PAGE, remaining)} more
          </button>
        </div>
      )}
    </section>
  );
}

function MonthSection({
  month,
  defaultOpen,
}: {
  month: EventMonth;
  defaultOpen: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const [dayLimit, setDayLimit] = useState(MONTH_DAYS);
  const panelId = `event-month-${month.key}`;
  const shownDays = month.days.slice(0, dayLimit);
  const remainingDays = month.days.length - shownDays.length;

  return (
    <li className="event-month">
      <button
        type="button"
        className="event-month-button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{month.label}</span>
        <span className="event-month-meta">
          {pluralCount(month.days.length, "day")} ·{" "}
          {pluralCount(month.entryCount, "entry", "entries")}
        </span>
      </button>
      {open && (
        <div id={panelId} className="event-month-panel">
          {shownDays.map((day) => (
            <DaySection key={day.key} day={day} />
          ))}
          {remainingDays > 0 && (
            <div className="event-more">
              <p role="status">
                Showing {shownDays.length} of {month.days.length} days.
              </p>
              <button
                type="button"
                className="button"
                onClick={() => setDayLimit((value) => value + MONTH_DAYS)}
              >
                Show {Math.min(MONTH_DAYS, remainingDays)} more{" "}
                {remainingDays === 1 ? "day" : "days"}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * The year fold (ADR 0015). Only rendered for a span over 24 months.
 *
 * Opening a year does not open a month: the year answers "which era", the month
 * answers "which month", and guessing the second for the reader would put a month
 * of rows in the DOM because they clicked a year.
 */
function YearSection({
  year,
  defaultOpen,
}: {
  year: EventYear;
  defaultOpen: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `event-year-${year.key}`;

  return (
    <li className="event-year">
      <button
        type="button"
        className="event-year-button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{year.label}</span>
        <span className="event-year-meta">
          {pluralCount(year.monthCount, "month")} ·{" "}
          {pluralCount(year.entryCount, "entry", "entries")}
        </span>
      </button>
      {open && (
        <div id={panelId} className="event-year-panel">
          <ol className="event-months">
            {year.months.map((month) => (
              <MonthSection key={month.key} month={month} defaultOpen={false} />
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}

export function EventListView({
  view,
  raw,
}: {
  view: EventListViewData;
  raw: unknown;
}): JSX.Element {
  return (
    <div className="event-view">
      <p className="settings-summary">{pluralCount(view.total, "entry", "entries")}</p>

      {view.total === 0 ? (
        <State kind="empty" message="This category is in this export but holds no entries." />
      ) : view.hasTimestamps ? (
        <>
          {view.showYears ? (
            <ol className="event-years">
              {view.years.map((year, index) => (
                <YearSection key={year.key} year={year} defaultOpen={index === 0} />
              ))}
            </ol>
          ) : (
            <ol className="event-months">
              {view.months.map((month, index) => (
                <MonthSection key={month.key} month={month} defaultOpen={index === 0} />
              ))}
            </ol>
          )}
          {view.undated.length > 0 && <PlainList entries={view.undated} heading="No date" />}
        </>
      ) : (
        <>
          <p className="event-note">
            This category has no timestamps, so it is shown as a plain list.
          </p>
          <PlainList entries={view.undated} heading={null} />
        </>
      )}

      <RawDisclosure raw={raw} />
    </div>
  );
}
