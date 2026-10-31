import { describe, expect, it } from "vitest";

import type { Category } from "../registry/types.js";
import { buildArchiveShape, compareShapes, type ArchiveInput } from "./drift.js";

/**
 * One invented registry, so the tests measure the tool rather than whichever
 * export the real registry was last measured against.
 */
function row(
  id: string,
  signatures: Category["signatures"],
  mediaPath: Category["mediaPath"] = "none",
): Category {
  return {
    id,
    label: id,
    privacyTier: 1,
    variantRisk: "low",
    match: { basenames: [new RegExp(`^${id}(?:_\\d+)?\\.json$`, "i")] },
    signatures,
    mediaPath,
  };
}

const DUAL = row("dual", [
  { kind: "object", requiredKeys: ["named_wrapper"] },
  { kind: "array", requiredKeys: ["fbid", "label_values", "media", "timestamp"] },
]);

const OTHER = row("other", [{ kind: "object", requiredKeys: ["other_wrapper"] }]);
const WITH_MEDIA = row(
  "with_media",
  [{ kind: "object", requiredKeys: ["items"] }],
  "root-relative",
);

const REGISTRY: readonly Category[] = [DUAL, OTHER, WITH_MEDIA];

const MEDIA_JPEG = { path: "photos/a.jpg", bytes: 100 };

function archive(
  label: string,
  json: ArchiveInput["json"],
  media: ArchiveInput["media"] = [],
): ArchiveInput {
  return { label, json, media };
}

function shapeOf(input: ArchiveInput) {
  return buildArchiveShape(input, REGISTRY);
}

const BASE = archive("one", [
  { path: "dual.json", value: { named_wrapper: [{}] } },
  { path: "other.json", value: { other_wrapper: [] } },
]);

describe("compareShapes — no change", () => {
  it("reports an empty diff for two identical exports", () => {
    const report = compareShapes(shapeOf(BASE), shapeOf(BASE));

    expect(report.changed).toEqual([]);
    expect(report.categoriesOnlyInA).toEqual([]);
    expect(report.categoriesOnlyInB).toEqual([]);
    expect(report.unrecognised).toEqual({ a: [], b: [] });
    expect(report.fingerprints.a).toBe(report.fingerprints.b);
    expect(report.media).toEqual({
      filesA: 0,
      filesB: 0,
      bytesA: 0,
      bytesB: 0,
      orphansA: 0,
      orphansB: 0,
    });
  });
});

describe("compareShapes — categories appearing and disappearing", () => {
  const ONLY_DUAL = archive("one", [{ path: "dual.json", value: { named_wrapper: [] } }]);

  it("reports a category only in the newer export", () => {
    const report = compareShapes(
      shapeOf(ONLY_DUAL),
      shapeOf(
        archive("two", [...ONLY_DUAL.json, { path: "other.json", value: { other_wrapper: [] } }]),
      ),
    );

    expect(report.categoriesOnlyInB).toEqual(["other"]);
    expect(report.categoriesOnlyInA).toEqual([]);
  });

  it("reports a category only in the older export", () => {
    const report = compareShapes(shapeOf(BASE), shapeOf(ONLY_DUAL));

    expect(report.categoriesOnlyInA).toEqual(["other"]);
    expect(report.categoriesOnlyInB).toEqual([]);
    expect(report.fingerprints.a).not.toBe(report.fingerprints.b);
  });
});

describe("compareShapes — key changes", () => {
  // Keys are compared at the top level of the object, or of `element[0]` for an
  // array — exactly what the fingerprint (ADR 0005) is built from.
  const before = archive("one", [{ path: "dual.json", value: { named_wrapper: [], a: 1, b: 2 } }]);
  const after = archive("two", [{ path: "dual.json", value: { named_wrapper: [], a: 1, c: 3 } }]);

  it("reports a key added and the key it replaced as removed", () => {
    const [change] = compareShapes(shapeOf(before), shapeOf(after)).changed;

    expect(change?.id).toBe("dual");
    expect(change?.keysAdded).toEqual(["c"]);
    expect(change?.keysRemoved).toEqual(["b"]);
  });

  it("reports an added key with nothing removed", () => {
    const wider = archive("two", [
      { path: "dual.json", value: { named_wrapper: [], a: 1, b: 2, c: 3 } },
    ]);
    const [change] = compareShapes(shapeOf(before), shapeOf(wider)).changed;

    expect(change?.keysAdded).toEqual(["c"]);
    expect(change?.keysRemoved).toEqual([]);
  });

  it("reports a count delta without calling it a key change", () => {
    // An array-shaped row: element[0]'s keys are unchanged, only the count moves.
    const oneEntry = archive("one", [{ path: "dual.json", value: [{ fbid: "1" }] }]);
    const threeEntries = archive("two", [
      { path: "dual.json", value: [{ fbid: "1" }, { fbid: "2" }, { fbid: "3" }] },
    ]);
    const [change] = compareShapes(shapeOf(oneEntry), shapeOf(threeEntries)).changed;

    expect(change?.entryCount).toEqual({ a: 1, b: 3 });
    expect(change?.keysAdded).toEqual([]);
    expect(change?.keysRemoved).toEqual([]);
  });
});

describe("compareShapes — signature satisfaction is per signature (ADR 0008)", () => {
  it("shows a dual-signature row satisfied by one export and stale for the other", () => {
    const old = archive("one", [{ path: "dual.json", value: { named_wrapper: [] } }]);
    const next = archive("two", [
      { path: "dual.json", value: [{ fbid: "1", label_values: [], media: [], timestamp: 1 }] },
    ]);

    const [change] = compareShapes(shapeOf(old), shapeOf(next)).changed;

    expect(change?.id).toBe("dual");
    // Two signatures on the row: the first export satisfies only the wrapper, the
    // second only the envelope. Neither export may look "satisfied" as a whole.
    expect(change?.signaturesStillSatisfied).toEqual({ a: [true, false], b: [false, true] });
  });
});

describe("compareShapes — media", () => {
  const json = [{ path: "thread/with_media.json", value: { items: [{ uri: "photos/a.jpg" }] } }];
  const rootCopy = { path: "photos/a.jpg", bytes: 100 };
  const threadCopy = { path: "thread/photos/a.jpg", bytes: 100 };

  it("reports the media base the export actually used", () => {
    // Both copies exist, so the declared base (root-relative) wins.
    const rootShape = buildArchiveShape({ label: "one", json, media: [rootCopy, threadCopy] }, [
      WITH_MEDIA,
    ]);
    expect(rootShape.categories[0]?.mediaPathUsed).toBe("root-relative");

    // Only the copy beside the JSON exists, so the export really is thread-relative.
    const threadShape = buildArchiveShape({ label: "two", json, media: [threadCopy] }, [
      WITH_MEDIA,
    ]);
    expect(threadShape.categories[0]?.mediaPathUsed).toBe("thread-relative");

    const [change] = compareShapes(rootShape, threadShape).changed;
    expect(change?.mediaPathUsed).toEqual({ a: "root-relative", b: "thread-relative" });
    expect(change?.media).toEqual({ refsA: 1, refsB: 1, missingA: 0, missingB: 0 });
  });

  it("counts an unreferenced media file as an orphan", () => {
    const withOrphan = archive(
      "two",
      [{ path: "with_media.json", value: { items: [{ uri: "photos/a.jpg" }] } }],
      [MEDIA_JPEG, { path: "photos/stray.png", bytes: 50 }],
    );

    const report = compareShapes(shapeOf(BASE), shapeOf(withOrphan));
    expect(report.media.orphansA).toBe(0);
    expect(report.media.orphansB).toBe(1);
    expect(report.media.bytesB).toBe(150);
  });

  it("counts a reference that resolves to nothing as missing", () => {
    const missing = archive("two", [
      { path: "with_media.json", value: { items: [{ uri: "photos/gone.jpg" }] } },
    ]);
    const [shape] = shapeOf(missing).categories;

    expect(shape?.mediaRefs).toBe(1);
    expect(shape?.mediaMissing).toBe(1);
  });
});

describe("compareShapes — mojibake", () => {
  it("reports a mojibake delta and the categories it affects", () => {
    // U+00C3 U+00A9 is the double-encoded form of "é" (ADR 0003).
    const broken = archive("two", [
      { path: "other.json", value: { other_wrapper: [{ a: "caf\u00c3\u00a9" }] } },
    ]);

    const report = compareShapes(shapeOf(BASE), shapeOf(broken));
    expect(report.mojibake.stringsA).toBe(0);
    expect(report.mojibake.stringsB).toBe(1);
    expect(report.mojibake.categoriesB).toBe(1);
  });
});

describe("buildArchiveShape", () => {
  it("buckets a file that matches no row as unrecognised, keeping only its shape", () => {
    const shape = shapeOf(
      archive("one", [{ path: "brand_new.json", value: { mystery: "value" } }]),
    );

    expect(shape.unrecognised).toEqual([
      { basename: "brand_new.json", kind: "object", keys: ["mystery"], entryCount: 0 },
    ]);
    expect(shape.categories).toEqual([]);
  });

  it("is deterministic: the same input yields the same fingerprint", () => {
    expect(shapeOf(BASE).fingerprint).toBe(shapeOf(BASE).fingerprint);
  });
});
