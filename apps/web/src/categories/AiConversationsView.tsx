import type { AiConversationsView as AiConversationsViewData } from "@instavault/core";
import type { JSX } from "react";

import { pluralCount } from "../categories/counts.js";
import { RawDisclosure } from "../categories/RawDisclosure.js";
import { Fields } from "../categories/settingsFields.js";
import { State } from "../ui/State.js";

/**
 * `ai_conversations` (D2): a labelled record, not a chat UI.
 *
 * Title, created date and summary use the existing settings field renderer. The
 * turns are one ordered list behind a disclosure: two records with long
 * transcripts would otherwise dominate the page, and there is no sender
 * bubble/body model to mimic.
 */
export function AiConversationsView({
  view,
  raw,
}: {
  view: AiConversationsViewData;
  raw: unknown;
}): JSX.Element {
  return (
    <div className="ai-view">
      <p className="settings-summary">{pluralCount(view.total, "conversation", "conversations")}</p>

      {view.total === 0 ? (
        <State kind="empty" message="This category is in this export but holds no conversations." />
      ) : (
        view.conversations.map((conversation, index) => (
          <section className="ai-conversation" key={`${conversation.title ?? "untitled"}-${index}`}>
            <h2 className="ai-title">{conversation.title ?? "Untitled conversation"}</h2>
            {conversation.fields.length > 0 && <Fields fields={conversation.fields} />}

            <details className="ai-transcript">
              <summary>
                Transcript · {conversation.turns.length}{" "}
                {conversation.turns.length === 1 ? "turn" : "turns"}
              </summary>
              <ol className="ai-turns">
                {conversation.turns.map((turn, turnIndex) => (
                  <li className="ai-turn" key={`${turnIndex}:${turn.timestamp ?? "none"}`}>
                    <p className="ai-turn-head">
                      <span className="ai-role">{turn.role}</span>
                      {turn.date !== null && (
                        <time
                          className="ai-turn-time"
                          dateTime={new Date((turn.timestamp ?? 0) * 1000).toISOString()}
                        >
                          {turn.date}
                        </time>
                      )}
                    </p>
                    <p className="ai-text">{turn.text}</p>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        ))
      )}

      <RawDisclosure raw={raw} />
    </div>
  );
}
