import type { MediaItemView, SettingsView as SettingsViewData } from "@instavault/core";
import type { JSX } from "react";

import { useMediaUrl, type MediaSource } from "../media/useMediaUrl.js";
import { State } from "../ui/State.js";
import { pluralCount } from "./counts.js";
import { RawDisclosure } from "./RawDisclosure.js";
import { Fields } from "./settingsFields.js";

/**
 * `personal_information` (docs/T2-DESIGN.md §2, D5).
 *
 * The profile photo is the one real media item in T2: a root-relative file
 * present in the ZIP, read through the same media layer as every other local
 * blob. It is not a remote URL. The fields are the same definition list the
 * settings screen uses.
 */

function ProfilePhoto({ item, source }: { item: MediaItemView; source: MediaSource }): JSX.Element {
  const media = useMediaUrl(item.id, source);

  if (media.status === "ready") {
    return <img className="profile-photo" src={media.url} alt="Profile photo" />;
  }
  if (media.status === "failed") {
    return (
      <p className="profile-photo is-failed" role="status">
        The profile photo is not stored on this device.
      </p>
    );
  }
  return (
    <p className="profile-photo is-pending" role="status">
      Loading the profile photo…
    </p>
  );
}

export function ProfileView({
  view,
  media,
  source,
  raw,
}: {
  view: SettingsViewData;
  media: readonly MediaItemView[];
  source: MediaSource;
  raw: unknown;
}): JSX.Element {
  const entry = view.entries[0];

  return (
    <div className="profile-view">
      <p className="settings-summary">
        {pluralCount(view.entries.length, "entry", "entries")}
        {media.length > 0 ? ` · ${pluralCount(media.length, "photo")}` : ""}
      </p>

      {view.entries.length === 0 ? (
        <State kind="empty" message="This category is in this export but holds no entries." />
      ) : (
        <>
          {media.map((item) => (
            <ProfilePhoto key={item.id} item={item} source={source} />
          ))}
          {entry !== undefined && <Fields fields={entry.fields} />}
        </>
      )}

      <RawDisclosure raw={raw} />
    </div>
  );
}
