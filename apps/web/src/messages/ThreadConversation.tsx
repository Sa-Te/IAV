import type { MediaItemView, ThreadMessage, ThreadSummary } from "@instavault/core";
import { useState, type JSX } from "react";

import { MediaDetail } from "../media/MediaDetail.js";
import { MediaTile } from "../media/MediaTile.js";
import { useArchiveRepository } from "../repository/RepositoryContext.js";

/**
 * One conversation, chronological, with attachments through the media layer.
 *
 * Read-only by construction: there is no input, no action and no request. The
 * note at the top says so, because "message view" is a place people expect to be
 * able to reply.
 */

function attachmentItem(
  message: ThreadMessage,
  index: number,
  uri: string,
  threadId: string,
): MediaItemView {
  return {
    id: uri,
    caption: message.text,
    takenAt: (message.timestampMs ?? 0) / 1000,
    // The category is a label for the tile; the thread keeps thumbnails distinct.
    category: `thread-${threadId}-${index}`,
  };
}

export function ThreadConversation({
  threadId,
  summary,
  messages,
  onBack,
}: {
  threadId: string;
  summary: ThreadSummary | undefined;
  messages: readonly ThreadMessage[];
  onBack: () => void;
}): JSX.Element {
  const repository = useArchiveRepository();
  const [open, setOpen] = useState<MediaItemView | null>(null);

  return (
    <>
      <p>
        <button type="button" onClick={onBack}>
          Back to conversations
        </button>
      </p>

      <h2>
        {summary === undefined || summary.participants.length === 0
          ? threadId
          : summary.participants.join(", ")}
      </h2>
      <p className="banner" role="note">
        This is a read-only copy of the export. Nothing is sent anywhere, and you cannot reply from
        here.
      </p>

      {messages.length === 0 ? (
        <p className="state state-empty">This conversation has no messages in this export.</p>
      ) : (
        <ol className="messages">
          {messages.map((message, index) => (
            <li key={`${index}:${message.timestampMs ?? "none"}`} className="message">
              <p className="message-head">
                <span className="message-sender">
                  {message.sender === "" ? "Unknown sender" : message.sender}
                </span>
                {message.timestampMs !== null && (
                  <time
                    className="message-time"
                    dateTime={new Date(message.timestampMs).toISOString()}
                  >
                    {new Date(message.timestampMs).toLocaleString()}
                  </time>
                )}
              </p>
              {message.text !== "" && <p className="message-text">{message.text}</p>}
              {message.attachments.length > 0 && (
                <ul className="message-media">
                  {message.attachments.map((attachment, mediaIndex) => {
                    const item = attachmentItem(message, mediaIndex, attachment.uri, threadId);
                    return (
                      <li key={`${mediaIndex}:${attachment.uri}`}>
                        <MediaTile item={item} source={repository} onOpen={() => setOpen(item)} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      {open !== null && (
        <MediaDetail
          item={open}
          index={0}
          total={1}
          source={repository}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
