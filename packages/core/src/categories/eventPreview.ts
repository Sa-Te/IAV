import type { LabelItem } from "./labelValues.js";

/**
 * The two measured shapes whose values are presentation, not data (M22 follow-up).
 *
 * `emoji_sliders` stores the colours it was drawn with, and `polls` stores each
 * option's own font size. Printed as text they read "Background colour: #FFFFFF"
 * and "Option 1 font size: 35", which is the archive talking rather than the
 * reader's content. The row applies them instead; core decides *what* the values
 * are, and the view decides how far to trust them for CSS.
 *
 * Only these two label sets produce a preview. Every other row keeps the plain
 * field list, and no colour name is mapped to a value here: the export's string is
 * passed through as it was written.
 */

export interface PollOption {
  readonly text: string;
  /** The export's own font size for this option; 0 when it did not set one. */
  readonly size: number;
}

export type EventPreview =
  | {
      readonly kind: "sticker";
      readonly emoji: string | null;
      readonly textColour: string | null;
      readonly backgroundColour: string | null;
    }
  | {
      readonly kind: "poll";
      readonly colour: string | null;
      readonly options: readonly PollOption[];
    };

function textOf(item: LabelItem | undefined): string | null {
  return item !== undefined && typeof item.value === "string" && item.value.trim() !== ""
    ? item.value
    : null;
}

/** The option number when the label is `Option N` or `Option N font size`. */
export function optionIndexOf(label: string): { index: string; size: boolean } | null {
  const match = /^Option (\d)( font size)?$/.exec(label);
  return match === null ? null : { index: match[1] ?? "", size: match[2] !== undefined };
}

export function previewOf(items: readonly LabelItem[]): EventPreview | null {
  const byLabel = new Map(items.map((item) => [item.label, item]));

  const options: PollOption[] = [];
  for (const item of items) {
    const option = optionIndexOf(item.label);
    if (option === null || option.size) continue;
    const text = textOf(item);
    if (text === null) continue;
    const size = Number(textOf(byLabel.get(`${item.label} font size`)) ?? 0);
    options.push({ text, size: Number.isFinite(size) ? size : 0 });
  }
  if (options.length > 0) {
    return { kind: "poll", colour: textOf(byLabel.get("Colour")), options };
  }

  const emoji = textOf(byLabel.get("Emoji"));
  const textColour = textOf(byLabel.get("Text colour"));
  const backgroundColour = textOf(byLabel.get("Background colour"));
  if (emoji !== null && (textColour !== null || backgroundColour !== null)) {
    return { kind: "sticker", emoji, textColour, backgroundColour };
  }

  return null;
}

/** Labels the preview already shows, so they are not printed again as fields. */
export function labelsConsumedByPreview(
  preview: EventPreview | null,
  items: readonly LabelItem[],
): Set<string> {
  const consumed = new Set<string>();
  if (preview === null) return consumed;
  if (preview.kind === "sticker") {
    for (const label of ["Emoji", "Text colour", "Background colour"]) consumed.add(label);
    return consumed;
  }
  consumed.add("Colour");
  for (const item of items) {
    if (optionIndexOf(item.label) !== null) consumed.add(item.label);
  }
  return consumed;
}
