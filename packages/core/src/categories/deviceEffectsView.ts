import type { CategorySource } from "../ingest/port.js";
import { toSettingsView, type SettingField } from "./settingsView.js";

/**
 * `device_camera_effects_support` as a screen can render it.
 *
 * The measured shape is thirty records with one repeated 32-character identifier
 * and one repeated support profile; only the envelope timestamp varies
 * (docs/T1-DESIGN.md §2). Rendering thirty identical cards would be a lie about
 * what the export contains, so records are grouped by identity and a group is
 * deduplicated only when its profile is identical. Different profiles under one
 * identity return `null`: the caller keeps the settings screen rather than
 * picking one profile and hiding the rest.
 */

export interface DeviceRecord {
  readonly ordinal: number;
  /** The envelope's own `timestamp` field, if the export wrote one. */
  readonly timestamp: SettingField | null;
}

export interface DeviceProfile {
  readonly identity: { readonly label: string; readonly text: string };
  /** Everything except the identity and the per-record timestamp. */
  readonly fields: readonly SettingField[];
  readonly records: readonly DeviceRecord[];
}

export interface DeviceEffectsView {
  readonly kind: "device-effects";
  readonly profiles: readonly DeviceProfile[];
  /** Total entries, including records collapsed into one profile. */
  readonly recordCount: number;
}

function isTimestampField(field: SettingField): boolean {
  return field.label === "timestamp" && field.value.kind === "timestamp";
}

export function toDeviceEffectsView(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): DeviceEffectsView | null {
  const settings = toSettingsView(record);
  if (settings === null) return null;

  const groups = new Map<
    string,
    {
      readonly identity: { readonly label: string; readonly text: string };
      readonly fields: readonly SettingField[];
      readonly signature: string;
      readonly records: DeviceRecord[];
    }
  >();

  for (const entry of settings.entries) {
    const [identity, ...rest] = entry.fields;
    if (identity === undefined || identity.value.kind !== "text") return null;

    const timestamp = rest.find(isTimestampField) ?? null;
    const fields = rest.filter((field) => field !== timestamp);
    const signature = JSON.stringify(fields);
    const key = identity.value.text;
    const existing = groups.get(key);

    if (existing === undefined) {
      groups.set(key, {
        identity: { label: identity.label, text: identity.value.text },
        fields,
        signature,
        records: [{ ordinal: entry.ordinal, timestamp }],
      });
      continue;
    }
    if (existing.signature !== signature) return null;
    existing.records.push({ ordinal: entry.ordinal, timestamp });
  }

  return {
    kind: "device-effects",
    profiles: [...groups.values()].map(({ identity, fields, records }) => ({
      identity,
      fields,
      records,
    })),
    recordCount: settings.entries.length,
  };
}
