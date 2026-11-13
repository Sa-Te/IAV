import type { SettingsView as SettingsViewData } from "@instavault/core";
import type { JSX } from "react";

import { State } from "../ui/State.js";
import { pluralCount } from "./counts.js";
import { RawDisclosure } from "./RawDisclosure.js";
import { Fields } from "./settingsFields.js";

/**
 * The T1 label/value screen (docs/T1-DESIGN.md §4, Group A).
 *
 * A definition list, not a table. One entry reads as a page; thirty entries read
 * as sections. The field renderer is shared with the device screen; the raw JSON
 * stays one closed disclosure away. The interpretation already happened in
 * `toSettingsView`.
 */
export function SettingsView({ view, raw }: { view: SettingsViewData; raw: unknown }): JSX.Element {
  return (
    <div className="settings-view">
      <p className="settings-summary">{pluralCount(view.entries.length, "entry", "entries")}</p>

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

      <RawDisclosure raw={raw} />
    </div>
  );
}
