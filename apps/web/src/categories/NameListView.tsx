import type { NameListView as NameListViewData } from "@instavault/core";
import { useState, type JSX } from "react";

import { State } from "../ui/State.js";
import { pluralCount } from "./counts.js";
import { RawDisclosure } from "./RawDisclosure.js";

/**
 * The three T2 name/place lists (docs/T2-DESIGN.md §6): advertisers, ad
 * categories and locations of interest. A vec of names is not an event and not a
 * settings page. The first 200 names render; the rest are one button away.
 */

export const NAME_PAGE = 200;

function Names({ names }: { names: readonly string[] }): JSX.Element {
  const [limit, setLimit] = useState(NAME_PAGE);
  const shown = names.slice(0, limit);
  const remaining = names.length - shown.length;

  return (
    <>
      <ul className="name-list">
        {shown.map((name, index) => (
          <li key={`${name}-${index}`}>{name}</li>
        ))}
      </ul>
      {remaining > 0 && (
        <div className="event-more">
          <p role="status">
            Showing {shown.length} of {names.length} names.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => setLimit((value) => value + NAME_PAGE)}
          >
            Show {Math.min(NAME_PAGE, remaining)} more
          </button>
        </div>
      )}
    </>
  );
}

export function NameListView({ view, raw }: { view: NameListViewData; raw: unknown }): JSX.Element {
  return (
    <div className="name-view">
      <p className="settings-summary">{pluralCount(view.total, "name")}</p>

      {view.sections.length === 0 ? (
        <State kind="empty" message="This category is in this export but holds no names." />
      ) : (
        view.sections.map((section) => (
          <section className="name-section" key={section.label}>
            <h2 className="name-heading">{section.label}</h2>
            {section.text !== undefined && <p className="name-text">{section.text}</p>}
            {section.names.length > 0 && <Names names={section.names} />}
          </section>
        ))
      )}

      <RawDisclosure raw={raw} />
    </div>
  );
}
