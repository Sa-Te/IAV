import type { JSX } from "react";

/**
 * `/dev/tokens` — the palette as an artefact, dev builds only.
 *
 * Both themes side by side, because a token that reads well in Umber can be
 * invisible in Paper and the only way to know is to look at them together.
 */

const COLORS = [
  "canvas",
  "surface",
  "raised",
  "sunken",
  "border",
  "border-strong",
  "text",
  "text-muted",
  "accent",
  "accent-hover",
  "accent-subtle",
  "on-accent",
  "success",
  "warning",
  "danger",
] as const;

const TYPE = [
  ["text-12", "The quick brown fox — 12"],
  ["text-13", "The quick brown fox — 13"],
  ["text-14", "The quick brown fox — 14"],
  ["text-16", "The quick brown fox — 16"],
  ["text-18", "The quick brown fox — 18"],
  ["text-24", "The quick brown fox — 24"],
  ["text-32", "The quick brown fox — 32"],
  ["text-48", "The quick brown fox — 48"],
] as const;

// Literal class names: Tailwind reads source text, so `w-${step}` would generate
// nothing at all.
const SPACE = [
  ["w-1", 4],
  ["w-2", 8],
  ["w-3", 12],
  ["w-4", 16],
  ["w-5", 20],
  ["w-6", 24],
  ["w-8", 32],
  ["w-10", 40],
  ["w-12", 48],
  ["w-16", 64],
  ["w-20", 80],
  ["w-24", 96],
  ["w-32", 128],
] as const;

const swatchClass: Readonly<Record<(typeof COLORS)[number], string>> = {
  canvas: "bg-canvas",
  surface: "bg-surface",
  raised: "bg-raised",
  sunken: "bg-sunken",
  border: "bg-border",
  "border-strong": "bg-border-strong",
  text: "bg-text",
  "text-muted": "bg-text-muted",
  accent: "bg-accent",
  "accent-hover": "bg-accent-hover",
  "accent-subtle": "bg-accent-subtle",
  "on-accent": "bg-on-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

function Panel({ theme }: { theme: "umber" | "paper" }): JSX.Element {
  return (
    <section data-theme={theme} className="rounded-lg border border-border bg-canvas p-6 text-text">
      <h2 className="text-24">{theme === "umber" ? "Umber" : "Paper"}</h2>

      <h3 className="mt-6 text-14 text-text-muted">Colour</h3>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {COLORS.map((color) => (
          <li key={color} className="text-12">
            <span className={`block h-10 rounded-sm border border-border ${swatchClass[color]}`} />
            {color}
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-14 text-text-muted">Type</h3>
      {TYPE.map(([className, sample]) => (
        <p key={className} className={className}>
          <span className="font-mono text-12 text-text-muted">{className}</span> {sample}
        </p>
      ))}

      <h3 className="mt-6 text-14 text-text-muted">Space</h3>
      <ul className="mt-2 space-y-1">
        {SPACE.map(([className, pixels]) => (
          <li key={className} className="flex items-center gap-3 text-12">
            <span className={`h-2 bg-accent ${className}`} />
            {className} · {pixels}px
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-14 text-text-muted">Components</h3>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" className="rounded-md bg-accent px-3 py-2 text-on-accent">
          Primary
        </button>
        <button type="button" className="rounded-md border border-border bg-surface px-3 py-2">
          Secondary
        </button>
        <a href="#tokens">A link</a>
        <span className="rounded-full border border-border px-3 py-1 text-13" aria-current="page">
          Active pill
        </span>
      </div>

      <div className="mt-4 rounded-md border border-border bg-surface p-4 text-13 text-text-muted">
        A quiet surface with muted text.
      </div>
    </section>
  );
}

export function DevTokens(): JSX.Element {
  return (
    <main className="gallery">
      <h1 className="text-32">Design tokens</h1>
      <p className="text-14 text-text-muted">
        Every value comes from <code>packages/tokens/src/tokens.css</code>. Both themes are rendered
        at once; the theme switch changes the page around them, not these panels.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2" id="tokens">
        <Panel theme="umber" />
        <Panel theme="paper" />
      </div>
    </main>
  );
}
