import { toPostEntries, type PostEntry } from "@instavault/core";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";

import { useMediaUrl } from "../media/useMediaUrl.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { DetailView } from "./DetailView.js";

/**
 * The gallery. Three visibly distinct tile states — skeleton, media, broken —
 * because "still loading" and "gave up" must never look the same.
 */

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly posts: readonly PostEntry[]; readonly media: number }
  | { readonly status: "error"; readonly message: string };

export function Gallery(): JSX.Element {
  const repository = useArchiveRepository();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selected, setSelected] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    void (async () => {
      try {
        const [category, summary] = await Promise.all([
          repository.getCategory("posts"),
          repository.summary(),
        ]);
        if (cancelled) return;
        setState({
          status: "ready",
          posts: toPostEntries(category?.data),
          media: summary?.counts.mediaStored ?? 0,
        });
      } catch {
        if (!cancelled) setState({ status: "error", message: "Could not read the archive." });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repository, attempt]);

  const close = useCallback(() => {
    setSelected(null);
    // Focus returns to the tile that opened the detail.
    openerRef.current?.focus();
  }, []);

  if (state.status === "loading") {
    return (
      <main className="gallery">
        <p role="status">Reading the archive…</p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="gallery">
        <h1>InstaVault</h1>
        <div role="alert" className="state state-error">
          <p>{state.message}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (state.posts.length === 0) {
    return (
      <main className="gallery">
        <h1>InstaVault</h1>
        <div className="state state-empty">
          <p>This archive has no posts.</p>
          <p>
            If you expected photos, import your export on the <a href="/dev/ingest">import page</a>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="gallery">
      <h1>InstaVault</h1>
      <p className="summary">
        {state.posts.length} posts · {state.media} media files on this device
      </p>

      <ul className="grid">
        {state.posts.map((post, index) => (
          <li key={`${post.id}-${index}`}>
            <button
              type="button"
              className="tile"
              aria-label={post.caption.trim() === "" ? "Open post" : post.caption}
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                setSelected(index);
              }}
            >
              <Tile post={post} />
            </button>
          </li>
        ))}
      </ul>

      {selected !== null && state.posts[selected] !== undefined && (
        <DetailView
          post={state.posts[selected]}
          index={selected}
          total={state.posts.length}
          onClose={close}
        />
      )}
    </main>
  );
}

function Tile({ post }: { post: PostEntry }): JSX.Element {
  const repository = useArchiveRepository();
  const media = useMediaUrl(post.id, repository);

  if (media.status === "pending") {
    return <span className="tile-body tile-pending" aria-hidden="true" />;
  }

  if (media.status === "failed") {
    return (
      <span className="tile-body tile-failed">
        <span aria-hidden="true">!</span>
        <span className="tile-failed-text">
          {media.reason === "missing" ? "File missing" : "Cannot display"}
        </span>
      </span>
    );
  }

  return (
    <span className="tile-body">
      {media.mime.startsWith("video/") ? (
        <video src={media.url} muted preload="metadata" aria-hidden="true" />
      ) : (
        <img
          src={media.url}
          alt={post.caption.trim() === "" ? "Post from your archive" : post.caption}
        />
      )}
    </span>
  );
}
