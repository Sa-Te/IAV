/**
 * `pnpm drift --propose <dir> <basename>`: what a newly seen file would need.
 *
 * Everything here is derived from one measured sample: the id from the filename,
 * the signature and key types from the parsed value, the media base from whether
 * the file's `uri` references actually resolve in that export. Nothing is
 * guessed — a value with no measurement (privacy tier, variant risk, the meaning
 * of a wrapper key) is printed as a TODO rather than filled in.
 *
 * It never writes a file. The caller prints; a human pastes.
 */
import { collectUris, firstEntryKeys, isPlainObject, kindOf } from "../ingest/payload.js";
import { basenameOf, dirnameOf } from "../ingest/zipEntries.js";
import type { Category, Signature } from "../registry/types.js";
import { resolveReference, type MediaBase } from "../domain/mediaPath.js";

export interface ProposeInput {
  /** Archive-relative path of the file, as it appeared in the export. */
  readonly path: string;
  readonly value: unknown;
  /** Every non-JSON entry name in that export, for measuring the media base. */
  readonly mediaNames: readonly string[];
}

export interface Proposal {
  readonly id: string;
  readonly category: Category;
  readonly signature: Signature | null;
  readonly mediaPath: Category["mediaPath"];
  /** Printed as a warning when the measurement could not decide. */
  readonly notes: readonly string[];
  readonly row: string;
  readonly schema: string;
  readonly fixture: string;
  readonly dataMapRow: string;
}

const NON_ID = /[^a-z0-9]+/g;

function idOf(basename: string): string {
  const withoutExtension = basename.replace(/\.[^.]*$/, "");
  const withoutSuffix = withoutExtension.replace(/_\d+$/, "");
  return withoutSuffix
    .toLowerCase()
    .replace(NON_ID, "_")
    .replace(/^_+|_+$/g, "");
}

function camelOf(id: string): string {
  const [first = "", ...rest] = id.split("_");
  return first + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

function labelOf(id: string): string {
  const text = id.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The zod expression for a measured value. Arrays and objects stay opaque. */
function zodFor(value: unknown): string {
  if (typeof value === "string") return "z.string()";
  if (typeof value === "number") return "z.number()";
  if (typeof value === "boolean") return "z.boolean()";
  if (Array.isArray(value)) return "z.array(z.unknown())";
  if (isPlainObject(value)) return "z.record(z.string(), z.unknown())";
  return "z.unknown()";
}

/** A synthetic value of the same JSON type. Never a slice of the real export. */
function fakeFor(value: unknown): unknown {
  if (typeof value === "string") return "example";
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return [];
  if (isPlainObject(value)) return {};
  return null;
}

function measuredSignature(value: unknown): Signature | null {
  const keys = firstEntryKeys(value);
  if (keys.length === 0) return null;
  const kind = kindOf(value);
  if (kind === "scalar") return null;
  return { kind, requiredKeys: keys };
}

function measuredMediaPath(input: ProposeInput, notes: string[]): Category["mediaPath"] {
  const uris = collectUris(input.value);
  if (uris.length === 0) return "none";

  const names = new Set(input.mediaNames);
  const dir = dirnameOf(input.path);
  const bases = uris.map((uri) => {
    const hit =
      resolveReference(uri, dir, "root-relative", (candidate) => names.has(candidate)) ??
      // The second probe exists to *measure* thread-relative, not to prefer it.
      resolveReference(uri, dir, "thread-relative", (candidate) => names.has(candidate));
    return hit?.base ?? null;
  });

  const found = bases.filter((base): base is MediaBase => base !== null);
  const unique = new Set(found);
  if (unique.size === 1 && found.length === uris.length) {
    const [only] = [...unique];
    return only ?? "none";
  }

  notes.push(
    `media path is unresolved (${found.length}/${uris.length} references hit a file${
      unique.size > 1 ? ", from both bases" : ""
    }) — the printed base is a placeholder and must be checked by hand`,
  );
  return "root-relative";
}

export function proposeCategory(input: ProposeInput): Proposal {
  const id = idOf(basenameOf(input.path));
  const notes: string[] = [];
  const signature = measuredSignature(input.value);
  const mediaPath = measuredMediaPath(input, notes);
  if (signature === null) {
    notes.push("no measurable signature: the sample is empty or scalar, so the row is name-only");
  }

  const category: Category = {
    id,
    label: labelOf(id),
    // Unmeasured, so print the most protective tier and make a human choose.
    privacyTier: 5,
    variantRisk: "high",
    match: {
      basenames: [
        new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:_\\d+)?\\.json$`, "i"),
      ],
    },
    signatures: signature === null ? [] : [signature],
    mediaPath,
  };

  const entry = Array.isArray(input.value) ? input.value[0] : input.value;
  const fields = isPlainObject(entry)
    ? Object.entries(entry).map(([key, value]) => `    ${key}: ${zodFor(value)},`)
    : [];
  const objectSchema =
    fields.length === 0 ? "z.unknown()" : `z\n  .object({\n${fields.join("\n")}\n  })\n  .loose()`;
  const camel = camelOf(id);
  const declarations =
    isPlainObject(entry) && fields.length > 0
      ? [
          `const ${camel}Entry = ${objectSchema};`,
          "",
          `export const ${camel}Schema = ${Array.isArray(input.value) ? `z.array(${camel}Entry)` : `${camel}Entry`};`,
        ]
      : [`export const ${camel}Schema = ${objectSchema};`];

  const signatureText =
    signature === null
      ? "signatures: [],"
      : `signatures: [\n      { kind: "${signature.kind}", requiredKeys: [${signature.requiredKeys
          .map((key) => JSON.stringify(key))
          .join(", ")}] },\n    ],`;

  const fixtureEntry = isPlainObject(entry)
    ? `{\n${Object.entries(entry)
        .map(([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(fakeFor(value))}`)
        .join(",\n")}\n    }`
    : "null";

  return {
    id,
    category,
    signature,
    mediaPath,
    notes,
    row: [
      "  {",
      `    id: ${JSON.stringify(id)},`,
      `    label: ${JSON.stringify(category.label)},`,
      "    privacyTier: 5, // TODO unmeasured — set from docs/DATA-MAP.md tiers",
      `    variantRisk: "high", // TODO unmeasured — a file seen once has no risk history`,
      `    match: { basenames: [${String(category.match.basenames[0])}] },`,
      `    ${signatureText.split("\n").join("\n    ")}`,
      `    mediaPath: ${JSON.stringify(mediaPath)},`,
      "  },",
    ].join("\n"),
    schema: [
      'import { z } from "zod";',
      "",
      "/**",
      " * Skeleton generated from one measured sample. Every value is stored verbatim:",
      " * arrays and objects stay opaque until a second export says what is in them.",
      " */",
      ...declarations,
      "",
    ].join("\n"),
    fixture: Array.isArray(input.value) ? `[\n    ${fixtureEntry}\n  ]` : fixtureEntry,
    dataMapRow: `| \`${id}\` | \`${input.path}\` | \`packages/core/schema/${id.replace(/_/g, "-")}.ts\` | \`packages/core/parsers/${id.replace(/_/g, "-")}.ts\` | none | high | not started |`,
  };
}
