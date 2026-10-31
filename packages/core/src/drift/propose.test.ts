import ts from "typescript";
import { describe, expect, it } from "vitest";

import { resolveCategory } from "../registry/resolve.js";
import { proposeCategory } from "./propose.js";

/**
 * `--propose` prints code a human pastes. A proposal that does not compile is
 * worse than no proposal, so the generated schema is handed to the real compiler
 * here rather than eyeballed.
 */

const GENERATED_PATH = new URL("./__generated_schema.ts", import.meta.url).pathname;

function typecheck(source: string): readonly string[] {
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    types: [],
    lib: ["lib.es2022.d.ts"],
  };

  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);

  // The file is virtual and lives beside the real sources, so `import "zod"`
  // resolves exactly as it would once pasted into packages/core/src/schema/.
  host.readFile = (name) => (name === GENERATED_PATH ? source : readFile(name));
  host.fileExists = (name) => name === GENERATED_PATH || fileExists(name);
  host.getSourceFile = (name, languageVersion) => {
    const text = name === GENERATED_PATH ? source : readFile(name);
    return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
  };

  const program = ts.createProgram([GENERATED_PATH], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) => diagnostic.file === undefined || diagnostic.file.fileName === GENERATED_PATH,
    )
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
}

const SAMPLES = {
  envelopeArray: {
    path: "ads_information/example_category.json",
    value: [
      { fbid: "1", label_values: [], media: [], timestamp: 1699999999 },
      { fbid: "2", label_values: [], media: [], timestamp: 1700000000 },
    ],
  },
  wrapper: {
    path: "activity/example_wrapper.json",
    value: { something_seen: [{ value: "x", timestamp: 1 }] },
  },
  empty: {
    path: "activity/example_empty.json",
    value: [],
  },
} as const;

describe("proposeCategory — the registry row", () => {
  it("derives an id from the filename and a signature from the measurement", () => {
    const proposal = proposeCategory({ ...SAMPLES.envelopeArray, mediaNames: [] });

    expect(proposal.id).toBe("example_category");
    expect(proposal.signature).toEqual({
      kind: "array",
      requiredKeys: ["fbid", "label_values", "media", "timestamp"],
    });
    expect(proposal.category.signatures).toEqual([proposal.signature ?? {}]);
    expect(proposal.category.mediaPath).toBe("none");
    expect(proposal.notes).toEqual([]);
  });

  it("produces a row that resolves the measured sample, under a foreign name", () => {
    const proposal = proposeCategory({ ...SAMPLES.wrapper, mediaNames: [] });

    expect(
      resolveCategory({ path: "renamed_by_a_future_export.json", sample: SAMPLES.wrapper.value }, [
        proposal.category,
      ]),
    ).toEqual({ ok: true, id: proposal.id, tier: 2 });
  });

  it("strips a numeric suffix from the id and keeps the row pasteable", () => {
    const proposal = proposeCategory({
      path: "likes/liked_posts_3.json",
      value: [{ title: "x" }],
      mediaNames: [],
    });

    expect(proposal.id).toBe("liked_posts");
    expect(proposal.row).toContain('id: "liked_posts"');
    expect(proposal.row).toContain("signatures: [");
    expect(proposal.dataMapRow).toContain("| `liked_posts` |");
  });

  it("defaults an unmeasured privacy tier to the most protective one", () => {
    const proposal = proposeCategory({ ...SAMPLES.wrapper, mediaNames: [] });

    expect(proposal.category.privacyTier).toBe(5);
    expect(proposal.row).toContain("TODO unmeasured");
  });

  it("claims no signature for an empty file, and says why", () => {
    const proposal = proposeCategory({ ...SAMPLES.empty, mediaNames: [] });

    expect(proposal.category.signatures).toEqual([]);
    expect(proposal.notes.join(" ")).toContain("no measurable signature");
  });
});

describe("proposeCategory — the measured media path", () => {
  const value = { items: [{ uri: "photos/a.jpg" }] };

  it("measures thread-relative when the file only exists beside the JSON", () => {
    const proposal = proposeCategory({
      path: "thread/category.json",
      value,
      mediaNames: ["thread/photos/a.jpg"],
    });

    expect(proposal.mediaPath).toBe("thread-relative");
    expect(proposal.notes).toEqual([]);
  });

  it("measures root-relative when the file exists at the archive root", () => {
    const proposal = proposeCategory({
      path: "thread/category.json",
      value,
      mediaNames: ["photos/a.jpg"],
    });

    expect(proposal.mediaPath).toBe("root-relative");
  });

  it("refuses to claim a base when no reference resolves, and says so", () => {
    const proposal = proposeCategory({ path: "thread/category.json", value, mediaNames: [] });

    expect(proposal.notes.join(" ")).toContain("media path is unresolved");
  });
});

describe("proposeCategory — the generated schema", () => {
  it("typechecks", () => {
    const proposal = proposeCategory({ ...SAMPLES.envelopeArray, mediaNames: [] });

    expect(typecheck(proposal.schema)).toEqual([]);
  });

  it("typechecks for an object-shaped file too", () => {
    const proposal = proposeCategory({ ...SAMPLES.wrapper, mediaNames: [] });

    expect(typecheck(proposal.schema)).toEqual([]);
  });

  it("would catch a broken schema — the check is not vacuous", () => {
    expect(
      typecheck('import { z } from "zod";\n\nexport const broken = z.object({ a: z.nope() });')
        .length,
    ).toBeGreaterThan(0);
  });
});
