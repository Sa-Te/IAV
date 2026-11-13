import { shortcodeOf, type SavedByFolderView, type SavedItem } from "@instavault/core";
import { useState, type JSX } from "react";

import { pluralCount } from "./counts.js";
import { RawDisclosure } from "./RawDisclosure.js";

/**
 * Saved posts, grouped by the collections that hold them (M22 follow-up).
 *
 * The membership is real but nested: each collection in `saved_collections.json`
 * carries its own post records, and most saved posts are in no collection at all.
 * The flat `saved_posts.json` supplies the date for a collection's post by URL.
 *
 * A folder is a native `<details>`, so it is keyboard-operable and expandable
 * without a bespoke ARIA dance. Each folder renders at most 200 posts at a time —
 * the same cap the event list uses — because one measured collection holds 141 and
 * the uncollected list holds 736.
 */

/** A folder renders at most this many posts at a time. */
export const FOLDER_PAGE = 200;

function PostRow({ post }: { post: SavedItem }): JSX.Element {
  const shortcode = post.url === null ? null : shortcodeOf(post.url);
  return (
    <li className="saved-post">
      {(post.caption !== "" || post.title !== "") && (
        <p className="saved-post-caption">{post.caption !== "" ? post.caption : post.title}</p>
      )}
      {post.url !== null && (
        <p className="event-link">
          <a
            href={post.url}
            rel="noreferrer noopener"
            target="_blank"
            aria-label={post.url}
            title={post.url}
            className={shortcode === null ? "settings-opaque" : undefined}
          >
            {shortcode === null ? post.url : <span className="event-shortcode">{shortcode}</span>}
          </a>
        </p>
      )}
      {post.date !== null && post.timestamp !== null && (
        <time className="event-date" dateTime={new Date(post.timestamp * 1000).toISOString()}>
          {post.date}
        </time>
      )}
    </li>
  );
}

function PostList({ posts }: { posts: readonly SavedItem[] }): JSX.Element {
  const [limit, setLimit] = useState(FOLDER_PAGE);
  const shown = posts.slice(0, limit);
  const remaining = posts.length - shown.length;

  return (
    <>
      <ol className="saved-posts">
        {shown.map((post, index) => (
          <PostRow key={`${post.url ?? ""}-${index}`} post={post} />
        ))}
      </ol>
      {remaining > 0 && (
        <div className="event-more">
          <p role="status">
            Showing {shown.length} of {posts.length} posts.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => setLimit((value) => value + FOLDER_PAGE)}
          >
            Show {Math.min(FOLDER_PAGE, remaining)} more
          </button>
        </div>
      )}
    </>
  );
}

export function SavedFoldersView({
  view,
  showLoose,
  raw,
}: {
  view: SavedByFolderView;
  /** The collections screen shows folders only; the saved-posts screen adds the rest. */
  showLoose: boolean;
  raw: unknown;
}): JSX.Element {
  const folderPosts = view.folders.reduce((sum, folder) => sum + folder.posts.length, 0);
  const loose = showLoose ? view.loose : [];

  if (view.folders.length === 0 && loose.length === 0) {
    return (
      <div className="saved-view">
        <p className="settings-summary">{pluralCount(view.total, "saved post")}</p>
        <p className="event-note">This category is in this export but holds no saved posts.</p>
        <RawDisclosure raw={raw} />
      </div>
    );
  }

  return (
    <div className="saved-view">
      <p className="settings-summary">
        {view.folders.length > 0
          ? `${pluralCount(view.folders.length, "collection")} · ${pluralCount(folderPosts, "saved post")}`
          : pluralCount(view.total, "saved post")}
        {showLoose && loose.length > 0
          ? ` · ${pluralCount(loose.length, "post")} in no collection`
          : ""}
      </p>

      {view.folders.map((folder, index) => (
        <details className="saved-folder" key={folder.key} open={index === 0}>
          <summary className="saved-folder-summary">
            <span className="saved-folder-name">{folder.name}</span>
            <span className="saved-folder-meta">
              {pluralCount(folder.posts.length, "post")}
              {folder.privacy !== null ? ` · ${folder.privacy.toLowerCase()}` : ""}
              {folder.updated !== null ? ` · updated ${folder.updated}` : ""}
            </span>
          </summary>
          <PostList posts={folder.posts} />
        </details>
      ))}

      {loose.length > 0 && (
        <details className="saved-folder" open>
          <summary className="saved-folder-summary">
            <span className="saved-folder-name">Not in a collection</span>
            <span className="saved-folder-meta">{pluralCount(loose.length, "post")}</span>
          </summary>
          <PostList posts={loose} />
        </details>
      )}

      <RawDisclosure raw={raw} />
    </div>
  );
}
