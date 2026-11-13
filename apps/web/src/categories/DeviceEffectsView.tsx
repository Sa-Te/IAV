import type { DeviceEffectsView as DeviceEffectsViewData } from "@instavault/core";
import type { JSX } from "react";

import { State } from "../ui/State.js";
import { pluralCount } from "./counts.js";
import { RawDisclosure } from "./RawDisclosure.js";
import { FieldValue, Fields } from "./settingsFields.js";

/**
 * `device_camera_effects_support` (docs/T1-DESIGN.md §4, Group C).
 *
 * The measured export holds thirty records of one device: one repeated identifier,
 * one repeated support profile, thirty different timestamps. Showing thirty
 * identical cards would be a lie, so the identity and profile are shown once and
 * the records are the varying part. If the data ever holds several identities or
 * several profiles, core either groups them or returns `null` and the settings
 * screen takes over.
 */
export function DeviceEffectsView({
  view,
  raw,
}: {
  view: DeviceEffectsViewData;
  raw: unknown;
}): JSX.Element {
  return (
    <div className="settings-view device-view">
      <p className="settings-summary">
        {pluralCount(view.recordCount, "record")} ·{" "}
        {pluralCount(view.profiles.length, "device profile")}
      </p>

      {view.profiles.length === 0 ? (
        <State kind="empty" message="This category is in this export but holds no records." />
      ) : (
        <div className="device-profiles">
          {view.profiles.map((profile) => (
            <section className="device-profile" key={profile.identity.text}>
              <h2 className="device-heading">{profile.identity.label}</h2>
              <p className="device-identity">
                <span className="settings-opaque" tabIndex={0} title={profile.identity.text}>
                  {profile.identity.text}
                </span>
              </p>

              <Fields fields={profile.fields} />

              <h3 className="device-records-heading">Records ({profile.records.length})</h3>
              <ol className="device-records">
                {profile.records.map((record) => (
                  <li className="device-record" key={record.ordinal}>
                    <span className="settings-label">Record {record.ordinal}</span>
                    <span className="settings-value">
                      {record.timestamp === null ? (
                        <span className="settings-absent">No timestamp</span>
                      ) : (
                        <FieldValue field={record.timestamp} />
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <RawDisclosure raw={raw} />
    </div>
  );
}
