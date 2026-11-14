import { isAttachmentPlaceholder, type ThreadMessage, type ThreadSummary } from "@instavault/core";
import { useEffect, type JSX } from "react";

import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { State } from "../ui/State.js";
import { MessageAttachment } from "./MessageAttachment.js";

/**
 * One conversation, chronological, with attachments inline beneath the text.
 *
 * Read-only by construction: there is no input, no action and no request. The
 * note at the top says so, because "message view" is a place people expect to be
 * able to reply.
 */

export function ThreadConversation({
  threadId,
  summary,
  messages,
  focusMessageIndex = null,
  onBack,
}: {
  threadId: string;
  summary: ThreadSummary | undefined;
  messages: readonly ThreadMessage[];
  focusMessageIndex?: number | null;
  onBack: () => void;
}): JSX.Element {
  const repository = useArchiveRepository();

  // A search hit jumps here: the message is the target, not the top of a long
  // transcript. The element is focusable only while it is the target.
  useEffect(() => {
    if (focusMessageIndex === null) return;
    const element = document.getElementById(`message-${focusMessageIndex}`);
    element?.scrollIntoView?.({ block: "center" });
    element?.focus();
  }, [focusMessageIndex]);

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
        <State kind="empty" message="This conversation has no messages in this export." />
      ) : (
        <ol className="messages">
          {messages.map((message, index) => {
            const placeholder = isAttachmentPlaceholder(message.text);
            const hasMedia = message.attachments.length > 0;
            const showText = message.text !== "" && !placeholder;
            return (
              <li
                key={`${index}:${message.timestampMs ?? "none"}`}
                id={`message-${index}`}
                tabIndex={focusMessageIndex === index ? -1 : undefined}
                className="message"
              >
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
                {showText && <p className="message-text">{message.text}</p>}
                {hasMedia && (
                  <ul className="message-media">
                    {message.attachments.map((attachment, mediaIndex) => (
                      <li key={`${mediaIndex}:${attachment.uri}`}>
                        <MessageAttachment attachment={attachment} source={repository} />
                      </li>
                    ))}
                  </ul>
                )}
                {placeholder && !hasMedia && (
                  <p className="message-attachment-note">Attachment not included in this export.</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
