import {
  threadMessages,
  toThreadSummaries,
  type CategoryRecord,
  type ThreadMessage,
  type ThreadSummary,
} from "@instavault/core";
import { useState, type JSX } from "react";

import { State } from "../ui/State.js";
import { ThreadConversation } from "./ThreadConversation.js";

/**
 * The message categories render as a thread list instead of a raw tree.
 *
 * It sits *inside* the T5 reveal gate (CategoryView), so none of this is mounted —
 * and the category is not read — until the person clicked "Show this category".
 */

function when(timestamp: number | null): string {
  if (timestamp === null) return "No messages";
  return new Date(timestamp).toLocaleString();
}

function people(thread: ThreadSummary): string {
  if (thread.participants.length === 0) return "No participants recorded";
  return thread.participants.join(", ");
}

export function ThreadList({ record }: { record: CategoryRecord }): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  const threads = toThreadSummaries(record);

  if (selected !== null) {
    return (
      <ThreadConversation
        threadId={selected}
        summary={threads.find((thread) => thread.id === selected)}
        messages={threadMessages(record, selected)}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (threads.length === 0) {
    return <State kind="empty" message="This category holds no conversations." />;
  }

  return (
    <>
      <p className="summary">
        {threads.length} {threads.length === 1 ? "conversation" : "conversations"}, newest first
      </p>
      <ul className="thread-list">
        {threads.map((thread) => (
          <li
            key={thread.id}
            className={thread.messageCount === 0 ? "thread thread-empty" : "thread"}
          >
            <button type="button" className="thread-open" onClick={() => setSelected(thread.id)}>
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
    </>
  );
}

export type { ThreadMessage };
