import type { JSX } from "react";

/**
 * `/dev/tokens` — the palette as an artefact, dev builds only.
 *
 * Both themes side by side, because a token that reads well in Umber can be
 * invisible in Paper and the only way to know is to look at them together.
 * Plain classes and token variables: there are no utility classes.
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
  "text-12",
  "text-13",
  "text-14",
  "text-16",
  "text-18",
  "text-24",
  "text-32",
  "text-48",
] as const;

const SPACE = [
  ["1", 4],
  ["2", 8],
  ["3", 12],
  ["4", 16],
  ["5", 20],
  ["6", 24],
  ["8", 32],
  ["10", 40],
  ["12", 48],
  ["16", 64],
  ["20", 80],
  ["24", 96],
  ["32", 128],
] as const;

function Panel({ theme }: { theme: "umber" | "paper" }): JSX.Element {
  return (
    <section data-theme={theme} className="dev-panel">
      <h2 className="dev-panel-title">{theme === "umber" ? "Umber" : "Paper"}</h2>

      <h3 className="dev-heading">Colour</h3>
      <ul className="dev-colors">
        {COLORS.map((color) => (
          <li key={color} className="dev-color">
            <span className="dev-swatch" style={{ background: `var(--token-color-${color})` }} />
            {color}
          </li>
        ))}
      </ul>

      <h3 className="dev-heading">Type</h3>
      {TYPE.map((token) => (
        <p key={token} style={{ fontSize: `var(--token-${token})` }}>
          <span className="dev-type-name">{token}</span> The quick brown fox
        </p>
      ))}

      <h3 className="dev-heading">Space</h3>
      <ul className="dev-space">
        {SPACE.map(([step, pixels]) => (
          <li key={step} className="dev-space-row">
            <span className="dev-space-bar" style={{ width: `var(--token-space-${step})` }} />
            {step} · {pixels}px
          </li>
        ))}
      </ul>

      <h3 className="dev-heading">Components</h3>
      <div className="dev-components">
        <button type="button" className="button">
          Primary
        </button>
        <button type="button" className="dev-button-secondary">
          Secondary
        </button>
        <a href="#tokens">A link</a>
        <span className="dev-pill" aria-current="page">
          Active pill
        </span>
      </div>

      <div className="dev-quiet">A quiet surface with muted text.</div>
    </section>
  );
}

export function DevTokens(): JSX.Element {
  return (
    <main className="gallery dev-tokens">
      <h1 className="dev-title">Design tokens</h1>
      <p className="dev-intro">
        Every value comes from <code>packages/tokens/src/tokens.css</code>. Both themes are rendered
        at once; the theme switch changes the page around them, not these panels.
      </p>
      <div className="dev-panels" id="tokens">
        <Panel theme="umber" />
        <Panel theme="paper" />
      </div>
    </main>
  );
}
