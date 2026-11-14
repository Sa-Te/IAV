import {
  buildIndex,
  normaliseQuery,
  search,
  threadMessages,
  toThreadSummaries,
  type CategoryRecord,
  type SearchHit,
  type ThreadMessage,
  type ThreadSummary,
} from "@instavault/core";
import { useMemo, useState, type JSX } from "react";

import { State } from "../ui/State.js";
import { ThreadConversation } from "./ThreadConversation.js";

/**
 * The message categories render as a thread list instead of a raw tree.
 *
 * It sits *inside* the T5 reveal gate (CategoryView), so none of this is mounted —
 * and the category is not read, and no search index is built — until the person
 * clicked "Show this category". The index is memory-only: no persistence, no
 * worker (33,703 messages in the measured archive; docs/T5-DESIGN.md §8).
 */

function threadFromHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (raw === "") return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function when(timestamp: number | null): string {
  if (timestamp === null) return "No messages";
  return new Date(timestamp).toLocaleString();
}

function people(thread: ThreadSummary): string {
  if (thread.participants.length === 0) return "No participants recorded";
  return thread.participants.join(", ");
}

function Snippet({ hit }: { hit: SearchHit }): JSX.Element {
  const at = hit.snippet.indexOf(hit.matched);
  if (at < 0) return <>{hit.snippet}</>;
  return (
    <>
      {hit.snippet.slice(0, at)}
      <mark>{hit.matched}</mark>
      {hit.snippet.slice(at + hit.matched.length)}
    </>
  );
}

interface HitGroup {
  readonly thread: ThreadSummary;
  readonly hits: readonly SearchHit[];
}

export function ThreadList({ record }: { record: CategoryRecord }): JSX.Element {
  const [selected, setSelected] = useState<string | null>(() =>
    threadFromHash(window.location.hash),
  );
  const [query, setQuery] = useState("");
  const [focusMessage, setFocusMessage] = useState<number | null>(null);

  const threads = useMemo(() => toThreadSummaries(record), [record]);
  const index = useMemo(
    () =>
      buildIndex(
        threads.map((thread) => ({
          id: thread.id,
          messages: threadMessages(record, thread.id).map((message) => message.text),
        })),
      ),
    [record, threads],
  );

  const needle = normaliseQuery(query);
  const hits = useMemo(
    () => (needle.length < 2 ? [] : search(index, query, 500)),
    [index, needle.length, query],
  );

  const groups = useMemo(() => {
    if (hits.length === 0) return [];
    const byThread = new Map<string, SearchHit[]>();
    for (const hit of hits) {
      const bucket = byThread.get(hit.threadId) ?? [];
      bucket.push(hit);
      byThread.set(hit.threadId, bucket);
    }
    const found: HitGroup[] = [];
    for (const [id, threadHits] of byThread) {
      const thread = threads.find((candidate) => candidate.id === id);
      if (thread !== undefined) found.push({ thread, hits: threadHits });
    }
    return found.sort((a, b) => {
      const count = b.hits.length - a.hits.length;
      if (count !== 0) return count;
      return (b.thread.newestTimestamp ?? 0) - (a.thread.newestTimestamp ?? 0);
    });
  }, [hits, threads]);

  const active =
    selected !== null && threads.some((thread) => thread.id === selected) ? selected : null;

  if (active !== null) {
    return (
      <ThreadConversation
        threadId={active}
        summary={threads.find((thread) => thread.id === active)}
        messages={threadMessages(record, active)}
        focusMessageIndex={focusMessage}
        onBack={() => {
          setSelected(null);
          setFocusMessage(null);
        }}
      />
    );
  }

  if (threads.length === 0) {
    return <State kind="empty" message="This category holds no conversations." />;
  }

  const searching = needle.length >= 2;

  return (
    <>
      <p className="summary">
        {threads.length} {threads.length === 1 ? "conversation" : "conversations"}, newest first
      </p>

      <p className="search-box">
        <label htmlFor="message-search">Search message bodies</label>
        <input
          id="message-search"
          type="search"
          value={query}
          placeholder="At least two characters"
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </p>

      {searching && (
        <p className="search-status" role="status">
          {hits.length === 0
            ? "No messages match this search."
            : `${hits.length} matching ${hits.length === 1 ? "message" : "messages"} in ${groups.length} ${
                groups.length === 1 ? "conversation" : "conversations"
              }.`}
        </p>
      )}

      {searching && groups.length > 0 && (
        <ul className="search-results">
          {groups.map((group) => {
            const first = group.hits[0];
            if (first === undefined) return null;
            return (
              <li className="search-result" key={group.thread.id}>
                <p className="search-thread">
                  {people(group.thread)}
                  <span className="search-count">
                    {group.hits.length} {group.hits.length === 1 ? "match" : "matches"}
                  </span>
                </p>
                <blockquote className="search-snippet">
                  <Snippet hit={first} />
                </blockquote>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setSelected(group.thread.id);
                    setFocusMessage(first.messageIndex);
                  }}
                >
                  Jump to message
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!searching && (
        <ul className="thread-list">
          {threads.map((thread) => (
            <li
              key={thread.id}
              className={thread.messageCount === 0 ? "thread thread-empty" : "thread"}
            >
              <button
                type="button"
                className="thread-open"
                onClick={() => {
                  setSelected(thread.id);
                  setFocusMessage(null);
                }}
              >
                <span className="thread-people">{people(thread)}</span>
                <span className="thread-meta">
                  {thread.messageCount === 0
                    ? "empty — no messages"
                    : `${thread.messageCount} ${thread.messageCount === 1 ? "message" : "messages"}`}
                  {thread.mediaCount > 0 ? ` · ${thread.mediaCount} media` : ""}
                </span>
                <span className="thread-when">{when(thread.newestTimestamp)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export type { ThreadMessage };
