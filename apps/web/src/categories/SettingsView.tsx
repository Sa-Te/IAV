import type { SettingField, SettingsView as SettingsViewData } from "@instavault/core";
import type { JSX } from "react";

import { State } from "../ui/State.js";
import { pluralCount } from "./counts.js";

/**
 * The T1 label/value screen (docs/T1-DESIGN.md §4, Group A).
 *
 * A definition list, not a table. Hierarchy comes from type size, weight and
 * space: there is no tint, no card and no new token. Nested lists are sections,
 * opaque values truncate visually and expand on focus, and the raw JSON stays one
 * disclosure away. The interpretation already happened in `toSettingsView`.
 */

/** Above this, a value is visually truncated (CSS ellipsis) and expands on focus. */
const OPAQUE_LENGTH = 80;

function FieldValue({ field }: { field: SettingField }): JSX.Element {
  const value = field.value;

  switch (value.kind) {
    case "absent":
      return <span className="settings-absent">Not provided</span>;

    case "text": {
      if (value.text === "") return <span className="settings-absent">Empty</span>;
      const long = value.text.length > OPAQUE_LENGTH;
      // A value that is itself an absolute URL is the user's own link. The app
      // never fetches it; the click is the person's.
      const href = value.href ?? (/^https?:\/\/\S+$/.test(value.text) ? value.text : undefined);
      if (href !== undefined) {
        return (
          <a
            href={href}
            rel="noreferrer noopener"
            target="_blank"
            className={long ? "settings-opaque" : undefined}
            title={long ? value.text : undefined}
          >
            {value.text}
          </a>
        );
      }
      return long ? (
        <span className="settings-opaque" tabIndex={0} title={value.text}>
          {value.text}
        </span>
      ) : (
        <>{value.text}</>
      );
    }

    case "timestamp":
      return value.date === null ? (
        // 0 is the export's "not set": the raw number is the fact, a 1970 date
        // would be an invented event.
        <span className="settings-raw-number">{value.raw}</span>
      ) : (
        <>
          <span className="settings-date">{value.date}</span>{" "}
          <span className="settings-raw-number">{value.raw}</span>
        </>
      );

    case "list":
      return (
        <section className="settings-group">
          <h3 className="settings-group-heading">{field.label}</h3>
          {field.title !== undefined && field.title !== field.label && (
            <p className="settings-group-title">{field.title}</p>
          )}
          {value.fields.length === 0 ? (
            <p className="settings-none">None in this export</p>
          ) : (
            <Fields fields={value.fields} />
          )}
        </section>
      );
  }
}

/**
 * Consecutive scalar fields share one `<dl>`; a nested list becomes a `<section>`
 * between them. This keeps the order of `label_values` and valid list markup.
 */
function Fields({ fields }: { fields: readonly SettingField[] }): JSX.Element {
  const blocks: JSX.Element[] = [];
  let run: SettingField[] = [];

  const flush = (): void => {
    if (run.length === 0) return;
    const current = run;
    run = [];
    blocks.push(
      <dl className="settings-fields" key={`dl-${blocks.length}`}>
        {current.map((field, index) => (
          <div className="settings-field" key={`${field.label}-${index}`}>
            <dt className="settings-label">{field.label}</dt>
            <dd className="settings-value">
              <FieldValue field={field} />
              {field.description !== undefined && (
                <span className="settings-description">{field.description}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>,
    );
  };

  for (const field of fields) {
    if (field.value.kind === "list") {
      flush();
      blocks.push(
        <div className="settings-field is-group" key={`list-${blocks.length}`}>
          <FieldValue field={field} />
        </div>,
      );
    } else {
      run.push(field);
    }
  }
  flush();

  return <>{blocks}</>;
}

export function SettingsView({ view, raw }: { view: SettingsViewData; raw: unknown }): JSX.Element {
  const count = pluralCount(view.entries.length, "entry", "entries");

  return (
    <div className="settings-view">
      <p className="settings-summary">{count}</p>

      {view.entries.length === 0 ? (
        <State kind="empty" message="This category is in this export but holds no entries." />
      ) : (
        <ol className="settings-entries">
          {view.entries.map((entry) => (
            <li className="settings-entry" key={entry.ordinal}>
              {view.entries.length > 1 && (
                <h2 className="settings-entry-heading">Entry {entry.ordinal}</h2>
              )}
              <Fields fields={entry.fields} />
            </li>
          ))}
        </ol>
      )}

      <details className="settings-raw">
        <summary>Raw data</summary>
        <pre>{JSON.stringify(raw, null, 2) ?? "null"}</pre>
      </details>
    </div>
  );
}
