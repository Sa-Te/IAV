/**
 * Per-view media selection: a set of archive paths and the byte total that set
 * covers, so the action bar can print "12 selected · 34 MB" without summing
 * anything at render time.
 *
 * State is data, every operation returns a new state, and every id is an archive
 * path — the same key the media store uses. Selection is therefore keyed by item,
 * never by position, which is why it survives a list re-render or a page change
 * and why the profile photo (one path referenced twice) is counted once.
 *
 * `sizes` is the stored size of each path in the media store. A path with no
 * stored blob is absent and contributes 0 bytes; `buildZipPlan` is what reports
 * it as skipped. Passing the map in makes the model pure and keeps the byte
 * count correct rather than guessed.
 */

export type MediaSizes = ReadonlyMap<string, number>;

export interface SelectionState {
  readonly ids: ReadonlySet<string>;
  /** `ids.size`, stored because the action bar renders it on every keystroke. */
  readonly count: number;
  /** Sum of the stored sizes of `ids`. */
  readonly bytes: number;
  readonly sizes: MediaSizes;
}

export interface SelectionSize {
  readonly count: number;
  readonly bytes: number;
}

export function createSelection(sizes: MediaSizes): SelectionState {
  return { ids: new Set(), count: 0, bytes: 0, sizes };
}

export function isSelected(state: SelectionState, id: string): boolean {
  return state.ids.has(id);
}

/** Exactly what the bar prints. Kept as a function so callers state the intent. */
export function size(state: SelectionState): SelectionSize {
  return { count: state.count, bytes: state.bytes };
}

function add(state: SelectionState, ids: Iterable<string>): SelectionState {
  const next = new Set(state.ids);
  let count = state.count;
  let bytes = state.bytes;
  for (const id of ids) {
    // A repeated path is one item, however many times the archive references it.
    if (next.has(id)) continue;
    next.add(id);
    count += 1;
    bytes += state.sizes.get(id) ?? 0;
  }
  return count === state.count ? state : { ...state, ids: next, count, bytes };
}

function remove(state: SelectionState, ids: Iterable<string>): SelectionState {
  const next = new Set(state.ids);
  let count = state.count;
  let bytes = state.bytes;
  for (const id of ids) {
    // Same rule in reverse: the size comes back exactly once.
    if (!next.delete(id)) continue;
    count -= 1;
    bytes -= state.sizes.get(id) ?? 0;
  }
  return count === state.count ? state : { ...state, ids: next, count, bytes };
}

/** Ctrl-click: add when absent, remove when present. */
export function toggle(state: SelectionState, id: string): SelectionState {
  return state.ids.has(id) ? remove(state, [id]) : add(state, [id]);
}

/**
 * Shift-click. `orderedIds` is the current view's order, so the range means what
 * the reader sees. Both ends are inclusive and the direction does not matter.
 *
 * An anchor that is no longer in the view (`fromId`) degrades to the one item
 * that was actually clicked. That is the only safe reading: the reader pointed at
 * `toId`, and guessing the rest of the range would select items they never saw.
 */
export function selectRange(
  state: SelectionState,
  orderedIds: readonly string[],
  fromId: string,
  toId: string,
): SelectionState {
  const to = orderedIds.indexOf(toId);
  if (to === -1) return state;
  const from = orderedIds.indexOf(fromId);
  if (from === -1) return add(state, [toId]);
  const start = Math.min(from, to);
  return add(state, orderedIds.slice(start, Math.max(from, to) + 1));
}

/** Select-all: every id in the current view, never a page or a rendered slice. */
export function selectAll(state: SelectionState, ids: Iterable<string>): SelectionState {
  return add(state, ids);
}

/** Deselect a subset (one month, one year) without touching the rest. */
export function deselect(state: SelectionState, ids: Iterable<string>): SelectionState {
  return remove(state, ids);
}

/** Deselect-all: count and bytes both go back to zero. */
export function clear(state: SelectionState): SelectionState {
  return { ...state, ids: new Set(), count: 0, bytes: 0 };
}
