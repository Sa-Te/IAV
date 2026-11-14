import {
  groupPeopleByYear,
  type Person,
  type PersonListView as PersonListViewData,
} from "@instavault/core";
import { useState, type JSX } from "react";

import { pluralCount } from "../categories/counts.js";
import { RawDisclosure } from "../categories/RawDisclosure.js";
import { State } from "../ui/State.js";
import { PersonCard } from "./PersonCard.js";

/**
 * The T4 person screen: one card per person, grouped by year when the export
 * carries dates (docs/T4-DESIGN.md §7, §8).
 *
 * The page cap is 200 cards (AGENTS §7), applied to the flat ordered list before
 * grouping so a year boundary cannot multiply the DOM. Alphabetical order inside
 * a year is the core's job; this component only slices and renders.
 */

export const PERSON_PAGE = 200;

function Cards({ people }: { people: readonly Person[] }): JSX.Element {
  return (
    <ul className="people-list">
      {people.map((person, index) => (
        <li key={`${person.username ?? person.displayName}-${index}`}>
          <PersonCard person={person} />
        </li>
      ))}
    </ul>
  );
}

export function PersonListView({
  view,
  raw,
}: {
  view: PersonListViewData;
  raw?: unknown;
}): JSX.Element {
  const [limit, setLimit] = useState(PERSON_PAGE);
  const shown = view.people.slice(0, limit);
  const remaining = view.total - shown.length;
  const grouped = view.hasDates ? groupPeopleByYear(shown) : null;

  return (
    <div className="people-view">
      <p className="settings-summary">{pluralCount(view.total, "person", "people")}</p>

      {view.total === 0 ? (
        <State kind="empty" message="This category is in this export but holds no people." />
      ) : grouped === null ? (
        <Cards people={shown} />
      ) : (
        <>
          {grouped.years.map((year) => (
            <section className="people-year" key={year.key}>
              <h2 className="people-heading">{year.label}</h2>
              <Cards people={year.people} />
            </section>
          ))}
          {grouped.undated.length > 0 && (
            <section className="people-year">
              <h2 className="people-heading">No date</h2>
              <Cards people={grouped.undated} />
            </section>
          )}
        </>
      )}

      {remaining > 0 && (
        <div className="event-more">
          <p role="status">
            Showing {shown.length} of {view.total} people.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => setLimit((value) => value + PERSON_PAGE)}
          >
            Show {Math.min(PERSON_PAGE, remaining)} more
          </button>
        </div>
      )}

      {raw !== undefined && <RawDisclosure raw={raw} />}
    </div>
  );
}
