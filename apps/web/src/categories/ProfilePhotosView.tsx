import type { MediaItemView } from "@instavault/core";
import type { JSX } from "react";

import { useMediaUrl, type MediaSource } from "../media/useMediaUrl.js";
import { State } from "../ui/State.js";
import { pluralCount } from "./counts.js";
import { RawDisclosure } from "./RawDisclosure.js";

/**
 * `profile_photos` — the profile picture(s) the export actually contains.
 *
 * The archive stores one record per photo with its own caption and creation time;
 * the file itself is root-relative and present in the ZIP. Until M22 this category
 * rendered as a raw tree, so the photo was only reachable through the Everything
 * gallery. It is the same three-state media layer as every other local blob: a
 * missing file says so, it does not sit in `pending` forever.
 */

function Photo({ item, source }: { item: MediaItemView; source: MediaSource }): JSX.Element {
  const media = useMediaUrl(item.id, source);
  const caption = item.caption !== "" ? item.caption : null;
  const terms = caption === null ? <em>No caption in the export</em> : <>{caption}</>;

  return (
    <figure className="profile-figure">
      {media.status === "ready" ? (
        <img className="profile-figure-photo" src={media.url} alt={caption ?? "Profile photo"} />
      ) : media.status === "failed" ? (
        <p className="profile-figure-photo is-failed" role="status">
          This photo is referenced by the archive but not stored on this device.
        </p>
      ) : (
        <p className="profile-figure-photo is-pending" role="status">
          Loading the profile photo…
        </p>
      )}
      <figcaption className="profile-figure-caption">
        <span className="profile-figure-text">{terms}</span>
        {item.takenAt > 0 && (
          <time
            className="profile-figure-date"
            dateTime={new Date(item.takenAt * 1000).toISOString()}
          >
            {new Date(item.takenAt * 1000).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
        )}
        <span className="profile-figure-size">
          {media.status === "ready" ? "Stored in this archive" : "Local file"}
        </span>
      </figcaption>
    </figure>
  );
}

export function ProfilePhotosView({
  media,
  source,
  raw,
}: {
  media: readonly MediaItemView[];
  source: MediaSource;
  raw: unknown;
}): JSX.Element {
  return (
    <div className="profile-view">
      <p className="settings-summary">{pluralCount(media.length, "photo")}</p>

      {media.length === 0 ? (
        <State kind="empty" message="This category is in this export but holds no photos." />
      ) : (
        <div className="profile-figures">
          {media.map((item) => (
            <Photo key={item.id} item={item} source={source} />
          ))}
        </div>
      )}

      <RawDisclosure raw={raw} />
    </div>
  );
}
