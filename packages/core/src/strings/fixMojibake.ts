const HAS_LATIN1_RANGE = /[\u0080-\u00ff]/;
// "Contains any code point above U+00FF" needs the full range, which includes
// U+0000 — the one place in this repo where matching a control character is the point.
// eslint-disable-next-line no-control-regex
const HAS_ABOVE_LATIN1 = /[^\u0000-\u00ff]/u;

/**
 * Repairs Instagram's double-encoded text.
 *
 * The export writes UTF-8 bytes as if they were Latin-1, then escapes the result
 * as `\uXXXX`. A caption "café" therefore arrives as "caf\u00c3\u00a9" — the
 * bytes C3 A9, one code point each. Reinterpreting those code points as bytes and
 * decoding them as UTF-8 restores the text (ADR 0003).
 *
 * Returns the input unchanged when:
 * - it contains no code point in U+0080–U+00FF (fast path: every ASCII string,
 *   which is the overwhelming majority of a 28.7 MB corpus);
 * - it contains any code point above U+00FF. Mixing genuine non-latin text (a
 *   real emoji, CJK, Arabic) with mojibake is ambiguous: we cannot tell which
 *   parts to reinterpret, and corrupting text that was already correct is worse
 *   than leaving text that is broken;
 * - the bytes are not valid UTF-8.
 *
 * Pure: no I/O, no dependencies, never throws.
 */
export function fixMojibake(value: string): string {
  if (!HAS_LATIN1_RANGE.test(value)) {
    return value;
  }

  if (HAS_ABOVE_LATIN1.test(value)) {
    return value;
  }

  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index);
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}
