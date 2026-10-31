import type { TreeView } from "@instavault/core";
import { useState, type JSX } from "react";

/**
 * Raw JSON, collapsible, children built only when a node is opened.
 *
 * The ceiling this avoids: `liked_posts` holds 42,197 entries. Rendering that
 * tree eagerly would freeze the tab; rendering one closed level costs one line.
 */

const PREVIEW_LENGTH = 80;

function preview(value: string): string {
  return value.length > PREVIEW_LENGTH ? `${value.slice(0, PREVIEW_LENGTH)}…` : value;
}

function isContainer(value: unknown): value is readonly unknown[] | Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function summaryOf(value: readonly unknown[] | Record<string, unknown>): string {
  return Array.isArray(value) ? `array [${value.length}]` : `object {${Object.keys(value).length}}`;
}

function Leaf({ name, value }: { name: string; value: unknown }): JSX.Element {
  const text = typeof value === "string" ? value : (JSON.stringify(value) ?? String(value));
  return (
    <li>
      <span className="tree-key">{name}</span>:{" "}
      <span className="tree-value" title={text}>
        {preview(text)}
      </span>
    </li>
  );
}

function Node({ name, value }: { name: string; value: unknown }): JSX.Element {
  const [open, setOpen] = useState(false);

  if (!isContainer(value)) {
    return <Leaf name={name} value={value} />;
  }

  const entries: readonly (readonly [string, unknown])[] = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);
  return (
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {name} <span className="tree-kind">{summaryOf(value)}</span>
      </button>
      {/* Built on expand, never before: 42,197 children must cost 42,197 only
          when someone asks for them. */}
      {open && (
        <ul>
          {entries.map(([childName, child]) => (
            <Node key={childName} name={childName} value={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CategoryTree({ view, caption }: { view: TreeView; caption: string }): JSX.Element {
  return (
    <div className="category-tree">
      <p className="banner" role="note">
        This category is stored exactly as Instagram provided it. We have not interpreted it.
      </p>
      <p className="summary">{caption}</p>
      <ul className="tree-root">
        <Node name={caption} value={view.value} />
      </ul>
    </div>
  );
}
