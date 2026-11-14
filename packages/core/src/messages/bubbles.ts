import type { ThreadMessage } from "./threads.js";

/**
 * Group consecutive messages for the bubble view.
 *
 * A group ends when the sender changes or the local calendar day changes. The
 * date is carried by the group, so the screen prints it once per sender/day run,
 * and a new day always starts a new group. This is pure so the grouping rule is
 * tested without a DOM.
 */

export interface MessageGroup {
  readonly sender: string;
  /** The group's first message index in the conversation. */
  readonly startIndex: number;
  /** Local `YYYY-MM-DD`, or `undated` when no message in the group has a stamp. */
  readonly dayKey: string;
  readonly date: string | null;
  readonly messages: readonly ThreadMessage[];
}

function dayOf(timestampMs: number | null): { key: string; date: string | null } {
  if (timestampMs === null) return { key: "undated", date: null };
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) return { key: "undated", date: null };
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  return {
    key,
    date: date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
  };
}

export function groupMessages(messages: readonly ThreadMessage[]): readonly MessageGroup[] {
  const groups: MessageGroup[] = [];
  let index = 0;

  for (const message of messages) {
    const day = dayOf(message.timestampMs);
    const current = groups[groups.length - 1];
    if (current !== undefined && current.sender === message.sender && current.dayKey === day.key) {
      groups[groups.length - 1] = { ...current, messages: [...current.messages, message] };
      index += 1;
      continue;
    }
    groups.push({
      sender: message.sender,
      startIndex: index,
      dayKey: day.key,
      date: day.date,
      messages: [message],
    });
    index += 1;
  }

  return groups;
}
