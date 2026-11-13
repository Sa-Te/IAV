/**
 * The link a label-less container holds (first absolute URL, any depth ≤ 4).
 *
 * Three measured T3 categories keep the link to the *story* inside a container
 * rather than at the top of the entry: `story_reaction_sticker_reactions` (under
 * `Owner`), `questions` and `quizzes` (under `Media`). `labelValues.ts` drops
 * label-less containers on purpose, so this is the one reader that looks inside
 * them, and only for a link: the first absolute URL in document order is the
 * media's own URL in all three, while the owner's profile URL comes later.
 *
 * Nothing is synthesised. A row with no URL in the export gets no link.
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function nestedUrlOf(raw: Record<string, unknown>): string | null {
  const walk = (items: unknown, depth: number): string | null => {
    if (!Array.isArray(items) || depth > 4) return null;
    for (const item of items) {
      if (!isObject(item)) continue;
      for (const candidate of [item.href, item.value]) {
        if (typeof candidate === "string" && /^https?:\/\//.test(candidate)) return candidate;
      }
      const nested = walk(item.dict, depth + 1);
      if (nested !== null) return nested;
    }
    return null;
  };
  return walk(raw.label_values, 0);
}
