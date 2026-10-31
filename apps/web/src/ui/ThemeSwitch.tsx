import { useEffect, useState, type JSX } from "react";

/**
 * System / Umber / Paper, as a real radio group.
 *
 * Radios rather than one aria-pressed button: this is a mutually exclusive choice
 * with three values, and native radios already give arrow-key navigation, a single
 * tab stop and correct announcements — reimplementing that by hand is how a custom
 * control ends up unusable by keyboard.
 *
 * "System" is stored as the absence of an explicit theme, so the CSS media query
 * keeps following the OS live instead of freezing whatever it was at load.
 */

export type ThemeChoice = "system" | "umber" | "paper";
export const THEME_KEY = "instavault-theme";

const OPTIONS: readonly { readonly value: ThemeChoice; readonly label: string }[] = [
  { value: "system", label: "System" },
  { value: "umber", label: "Umber" },
  { value: "paper", label: "Paper" },
];

function storedChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "umber" || value === "paper" ? value : "system";
  } catch {
    return "system";
  }
}

function prefersLight(): boolean {
  // Older browsers and jsdom do not implement matchMedia; Umber is the default.
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  );
}

function apply(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
    root.style.colorScheme = prefersLight() ? "light" : "dark";
    return;
  }
  root.dataset.theme = choice;
  root.style.colorScheme = choice === "paper" ? "light" : "dark";
}

export function ThemeSwitch(): JSX.Element {
  const [choice, setChoice] = useState<ThemeChoice>(storedChoice);

  useEffect(() => {
    apply(choice);
  }, [choice]);

  return (
    <fieldset className="theme-switch">
      <legend>Theme</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} className="theme-option">
          <input
            type="radio"
            name="theme"
            value={option.value}
            checked={choice === option.value}
            onChange={() => {
              setChoice(option.value);
              try {
                if (option.value === "system") localStorage.removeItem(THEME_KEY);
                else localStorage.setItem(THEME_KEY, option.value);
              } catch {
                /* a blocked store still lets the choice apply for this page */
              }
            }}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
