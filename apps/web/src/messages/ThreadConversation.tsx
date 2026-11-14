import {
  groupMessages,
  isAttachmentPlaceholder,
  type ThreadMessage,
  type ThreadSummary,
} from "@instavault/core";
import { useEffect, type JSX } from "react";

import { useArchiveRepository } from "../repository/RepositoryContext.js";
import { State } from "../ui/State.js";
import { MessageAttachment } from "./MessageAttachment.js";

/**
 * One conversation, chronological.
 *
 * When the export identifies exactly one sender as the account holder (D3), the
 * messages render as aligned bubbles: the owner on the right over the
 * accent-subtle surface, everyone else on the left over the raised surface.
 * Consecutive messages from one sender on one day share a sender/date label.
 * When the owner cannot be identified, the same data stays a labelled list with
 * one sentence saying why; it is never guessed by frequency or position.
 *
 * Read-only by construction: there is no input, no action and no request.
 */

function MessageContent({ message }: { message: ThreadMessage }): JSX.Element {
  const repository = useArchiveRepository();
  const placeholder = isAttachmentPlaceholder(message.text);
  const hasMedia = message.attachments.length > 0;
  const showText = message.text !== "" && !placeholder;

  return (
    <>
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
    </>
  );
}

function Bubbles({
  messages,
  ownerSender,
  focusMessageIndex,
}: {
  messages: readonly ThreadMessage[];
  ownerSender: string;
  focusMessageIndex: number | null;
}): JSX.Element {
  const groups = groupMessages(messages);

  return (
    <ol className="bubbles">
      {groups.map((group) => {
        const owner = group.sender === ownerSender;
        return (
          <li
            className={owner ? "bubble-group is-owner" : "bubble-group is-other"}
            key={`${group.sender}:${group.dayKey}:${group.messages[0]?.timestampMs ?? "none"}`}
          >
            <p className="bubble-meta">
              <span className="bubble-sender">{group.sender}</span>
              {group.date !== null && (
                <time
                  className="bubble-date"
                  dateTime={new Date(group.messages[0]?.timestampMs ?? 0).toISOString()}
                >
                  {group.date}
                </time>
              )}
            </p>
            <ol className="bubble-list">
              {group.messages.map((message, index) => (
                <li
                  className={owner ? "bubble bubble-owner" : "bubble bubble-other"}
                  key={`${index}:${message.timestampMs ?? "none"}`}
                  id={`message-${group.startIndex + index}`}
                  tabIndex={focusMessageIndex === group.startIndex + index ? -1 : undefined}
                >
                  {/* The side is visual; the sender is in the content for every
                      message, so a screen reader gets the same information. */}
                  <span className="visually-hidden">{`${message.sender}: `}</span>
                  <MessageContent message={message} />
                </li>
              ))}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}

export function ThreadConversation({
  threadId,
  summary,
  messages,
  ownerSender = null,
  focusMessageIndex = null,
  onBack,
}: {
  threadId: string;
  summary: ThreadSummary | undefined;
  messages: readonly ThreadMessage[];
  ownerSender?: string | null;
  focusMessageIndex?: number | null;
  onBack: () => void;
}): JSX.Element {
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
      ) : ownerSender !== null ? (
        <Bubbles
          messages={messages}
          ownerSender={ownerSender}
          focusMessageIndex={focusMessageIndex}
        />
      ) : (
        <>
          <p className="banner" role="note">
            The export does not say which participant is the account holder, so this is a labelled
            list rather than aligned bubbles.
          </p>
          <ol className="messages">
            {messages.map((message, index) => (
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
                <MessageContent message={message} />
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}
