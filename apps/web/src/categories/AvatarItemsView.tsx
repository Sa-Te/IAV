import type { AvatarItemsView as AvatarItemsViewData } from "@instavault/core";
import type { JSX } from "react";

import { State } from "../ui/State.js";
import { pluralCount } from "./counts.js";
import { RawDisclosure } from "./RawDisclosure.js";

/**
 * `avatar_items` (docs/T1-DESIGN.md §4, Group B).
 *
 * `item` is a remote URL, not image bytes. A thumbnail would need a network fetch,
 * which the app never makes, so each tile is a labelled placeholder: the item's
 * ordinal, the fact that there is no local image, and the URL itself as a link the
 * person may choose to open. Nothing is invented to fill the box.
 */
export function AvatarItemsView({
  view,
  raw,
}: {
  view: AvatarItemsViewData;
  raw: unknown;
}): JSX.Element {
  return (
    <div className="avatar-view">
      <p className="settings-summary">{pluralCount(view.items.length, "item")}</p>

      {view.items.length === 0 ? (
        <State kind="empty" message="This category is in this export but holds no items." />
      ) : (
        <ul className="avatar-grid">
          {view.items.map((item) => (
            <li className="avatar-card" key={item.ordinal}>
              <span className="avatar-placeholder" aria-hidden="true">
                No image
              </span>
              <h2 className="avatar-heading">Item {item.ordinal}</h2>
              <dl className="settings-fields">
                <div className="settings-field">
                  <dt className="settings-label">Type</dt>
                  <dd className="settings-value">
                    {item.type === "" ? (
                      <span className="settings-absent">Not provided</span>
                    ) : (
                      item.type
                    )}
                  </dd>
                </div>
                <div className="settings-field">
                  <dt className="settings-label">Acquired</dt>
                  <dd className="settings-value">
                    {item.acquiredDate === null ? (
                      <span className="settings-absent">Not provided</span>
                    ) : (
                      item.acquiredDate
                    )}
                  </dd>
                </div>
                <div className="settings-field">
                  <dt className="settings-label">item</dt>
                  <dd className="settings-value">
                    <a
                      href={item.item}
                      rel="noreferrer noopener"
                      target="_blank"
                      className="settings-opaque"
                      title={item.item}
                    >
                      {item.item}
                    </a>
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      <RawDisclosure raw={raw} />
    </div>
  );
}
