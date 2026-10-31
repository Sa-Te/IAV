import { opaqueArraySchema, opaqueObjectSchema, type OpaqueKind } from "../schema/opaque.js";
import type { ParseResult } from "./result.js";

/**
 * The parser for categories registered as "parse and store verbatim, no view in
 * v1" (M7b). One parser for all of them, because there is one behaviour: assert
 * the measured container kind and hand back every value untouched.
 *
 * Entries are the array's elements, or the whole object as a single entry. The
 * raw payload is preserved exactly — no key is renamed, no value interpreted, no
 * default invented for a missing one.
 */
export function parseOpaque(input: unknown, kind: OpaqueKind): ParseResult<readonly unknown[]> {
  if (kind === "array") {
    const parsed = opaqueArraySchema.safeParse(input);
    return parsed.success
      ? { ok: true, data: parsed.data, warnings: [] }
      : { ok: false, reason: "expected a JSON array", raw: input };
  }

  const parsed = opaqueObjectSchema.safeParse(input);
  return parsed.success
    ? { ok: true, data: [parsed.data], warnings: [] }
    : { ok: false, reason: "expected a JSON object", raw: input };
}
