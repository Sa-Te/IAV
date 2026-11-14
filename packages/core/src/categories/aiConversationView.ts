import type { CategorySource } from "../ingest/port.js";
import { entriesOf, payloadsOf } from "./entries.js";
import { localisedDate } from "./format.js";
import type { SettingField } from "./settingsView.js";

/**
 * `ai_conversations`: two records, a label/value envelope, and the turns nested
 * inside one label-less container (docs/T5-DESIGN.md §5).
 *
 * This is interpretation, so it lives in core. The view is a labelled record plus
 * an ordered turn list; it is not a chat UI, and it does not invent a role when
 * the export left `Name` empty. `null` means the record is not this shape and the
 * caller keeps the generic view.
 */

export interface AiTurn {
  readonly role: string;
  readonly text: string;
  /** Unix seconds; null when the turn carries no timestamp. */
  readonly timestamp: number | null;
  readonly date: string | null;
}

export interface AiConversation {
  readonly title: string | null;
  /** The header fields, rendered by the existing settings field renderer. */
  readonly fields: readonly SettingField[];
  readonly turns: readonly AiTurn[];
}

export interface AiConversationsView {
  readonly kind: "ai-conversations";
  readonly conversations: readonly AiConversation[];
  readonly total: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function rawItems(entry: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(entry.label_values) ? entry.label_values.filter(isObject) : [];
}

function labelValue(items: readonly Record<string, unknown>[], label: string): string {
  for (const item of items) {
    if (item.label === label) {
      const value = text(item.value);
      if (value !== "") return value;
    }
  }
  return "";
}

function timestampIn(items: readonly Record<string, unknown>[]): number | null {
  for (const item of items) {
    if (typeof item.timestamp_value === "number" && item.timestamp_value > 0) {
      return item.timestamp_value;
    }
    if (Array.isArray(item.dict)) {
      const nested = timestampIn(item.dict.filter(isObject));
      if (nested !== null) return nested;
    }
  }
  return null;
}

/** The label-less container with the most children is the turn list. */
function turnsContainer(
  items: readonly Record<string, unknown>[],
): readonly Record<string, unknown>[] {
  let best: Record<string, unknown>[] = [];
  for (const item of items) {
    if (typeof item.label === "string" || !Array.isArray(item.dict)) continue;
    const children = item.dict.filter(isObject);
    if (children.length > best.length) best = children;
  }
  return best;
}

function turnOf(child: Record<string, unknown>): AiTurn | null {
  const items = Array.isArray(child.dict) ? child.dict.filter(isObject) : [];
  if (items.length === 0) return null;
  const message = items.find((item) => item.label === "Message" && text(item.value) !== "");
  const body = message === undefined ? "" : text(message.value);
  if (body === "") return null;
  const timestamp = timestampIn(items);
  return {
    role: labelValue(items, "Name") || "Unknown speaker",
    text: body,
    timestamp,
    date: timestamp === null ? null : localisedDate(timestamp),
  };
}

function conversationOf(entry: Record<string, unknown>): AiConversation | null {
  const items = rawItems(entry);
  const turns = turnsContainer(items)
    .map(turnOf)
    .filter((turn): turn is AiTurn => turn !== null);
  if (turns.length === 0) return null;

  const fields: SettingField[] = [];
  if (typeof entry.timestamp === "number" && entry.timestamp > 0) {
    fields.push({
      label: "Created",
      value: {
        kind: "timestamp",
        raw: entry.timestamp,
        date: localisedDate(entry.timestamp),
      },
    });
  }
  const summary = labelValue(items, "Summary");
  if (summary !== "") {
    fields.push({ label: "Summary", value: { kind: "text", text: summary } });
  }

  return {
    title: text(entry.title) || null,
    fields,
    turns,
  };
}

export function toAiConversationsView(record: {
  readonly data: unknown;
  readonly sources?: readonly CategorySource[];
}): AiConversationsView | null {
  const conversations: AiConversation[] = [];
  for (const payload of payloadsOf(record)) {
    const entries = entriesOf(payload);
    if (entries === null) return null;
    for (const entry of entries) {
      if (!isObject(entry)) return null;
      const conversation = conversationOf(entry);
      if (conversation !== null) conversations.push(conversation);
    }
  }

  if (conversations.length === 0) return null;
  return { kind: "ai-conversations", conversations, total: conversations.length };
}
