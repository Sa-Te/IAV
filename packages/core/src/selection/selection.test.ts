import { describe, expect, it } from "vitest";

import {
  clear,
  createSelection,
  deselect,
  isSelected,
  selectAll,
  selectRange,
  size,
  toggle,
} from "./selection.js";

const MB = 1024 * 1024;

/** The stored size, as the media store records it: one entry per archive path. */
const SIZES = new Map([
  ["a.jpg", 10 * MB],
  ["b.jpg", 20 * MB],
  ["c.jpg", 30 * MB],
  ["d.jpg", 40 * MB],
  ["e.jpg", 50 * MB],
]);

const ORDER = ["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg"];

function empty() {
  return createSelection(SIZES);
}

describe("selection", () => {
  it("starts empty in both count and bytes", () => {
    expect(size(empty())).toEqual({ count: 0, bytes: 0 });
  });

  it("toggles one item in, then out, restoring the byte total", () => {
    let state = toggle(empty(), "b.jpg");
    expect(size(state)).toEqual({ count: 1, bytes: 20 * MB });
    expect(isSelected(state, "b.jpg")).toBe(true);

    state = toggle(state, "b.jpg");
    expect(size(state)).toEqual({ count: 0, bytes: 0 });
    expect(isSelected(state, "b.jpg")).toBe(false);
  });

  it("selects exactly three of five in a range from index 1 to 3", () => {
    const state = selectRange(empty(), ORDER, "b.jpg", "d.jpg");

    expect(size(state).count).toBe(3);
    expect([...state.ids]).toEqual(["b.jpg", "c.jpg", "d.jpg"]);
  });

  it("selects the same range in either direction", () => {
    const forward = selectRange(empty(), ORDER, "b.jpg", "d.jpg");
    const backward = selectRange(empty(), ORDER, "d.jpg", "b.jpg");

    expect([...forward.ids]).toEqual([...backward.ids]);
  });

  it("falls back to only the clicked end when the anchor left the view", () => {
    const state = selectRange(empty(), ORDER, "gone.jpg", "c.jpg");

    expect([...state.ids]).toEqual(["c.jpg"]);
    expect(size(state).count).toBe(1);
  });

  it("never selects everything when both ends are absent", () => {
    const state = selectRange(empty(), ORDER, "gone.jpg", "also-gone.jpg");

    expect(size(state)).toEqual({ count: 0, bytes: 0 });
  });

  it("keeps existing items when a range is added", () => {
    const state = selectRange(toggle(empty(), "e.jpg"), ORDER, "a.jpg", "b.jpg");

    expect([...state.ids]).toEqual(["e.jpg", "a.jpg", "b.jpg"]);
    expect(size(state).count).toBe(3);
  });

  it("counts a path referenced twice once, in ids and in bytes", () => {
    // The profile photo is referenced by personal_information and profile_photos;
    // both resolve to the same archive path.
    const duplicated = ["profile.jpg", "profile.jpg", "a.jpg"];
    const state = selectAll(empty(), duplicated);

    expect(size(state)).toEqual({ count: 2, bytes: 10 * MB });
  });

  it("selects exactly the ids it is given, never an id it was not given", () => {
    // The view's full set is the caller's contract (the UI passes every item in
    // the view, not the rendered page). The model can only add what it is handed.
    const state = selectAll(empty(), ["a.jpg", "b.jpg"]);

    expect([...state.ids]).toEqual(["a.jpg", "b.jpg"]);
    expect(state.ids.has("c.jpg")).toBe(false);
  });

  it("reports the exact byte total after a mixed add and remove", () => {
    let state = selectAll(empty(), ["a.jpg", "b.jpg", "c.jpg", "d.jpg"]);
    state = toggle(state, "b.jpg");
    state = deselect(state, ["c.jpg"]);

    expect(size(state)).toEqual({ count: 2, bytes: 50 * MB });
  });

  it("deselects a subset and leaves the rest alone", () => {
    const all = selectAll(empty(), ORDER);
    const state = deselect(all, ["b.jpg", "d.jpg"]);

    expect([...state.ids]).toEqual(["a.jpg", "c.jpg", "e.jpg"]);
    expect(size(state)).toEqual({ count: 3, bytes: 90 * MB });
  });

  it("returns the same state when a deselect removes nothing", () => {
    const state = toggle(empty(), "a.jpg");

    expect(deselect(state, ["e.jpg"])).toBe(state);
  });

  it("clear resets count and bytes to zero and keeps the size lookup", () => {
    const state = clear(selectAll(empty(), ORDER));

    expect(size(state)).toEqual({ count: 0, bytes: 0 });
    expect(state.ids.size).toBe(0);
    expect(toggle(state, "a.jpg").bytes).toBe(10 * MB);
  });

  it("is immutable: an operation never mutates the state it was given", () => {
    const before = toggle(empty(), "a.jpg");
    const after = toggle(before, "b.jpg");

    expect([...before.ids]).toEqual(["a.jpg"]);
    expect([...after.ids]).toEqual(["a.jpg", "b.jpg"]);
  });
});
