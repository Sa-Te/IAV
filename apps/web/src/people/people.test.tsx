// @vitest-environment jsdom
import type { Person, PersonListView as PersonListViewData } from "@instavault/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { initialsOf, PersonCard } from "./PersonCard.js";
import { PERSON_PAGE, PersonListView } from "./PersonListView.js";

const AT = (year: number, month: number, day: number): number =>
  Date.UTC(year, month - 1, day, 12, 0, 0) / 1000;

const ada: Person = {
  displayName: "Ada Lovelace",
  username: "ada",
  profileUrl: "https://www.instagram.com/ada",
  timestamp: AT(2024, 5, 1),
};

function viewOf(people: readonly Person[]): PersonListViewData {
  const dated = people.filter((person) => person.timestamp !== null);
  return {
    kind: "people",
    people,
    total: people.length,
    hasDates: dated.length > 0,
    years: [],
    undated: [],
  };
}

afterEach(cleanup);

describe("PersonCard", () => {
  it("renders the name, the username, the date and a real outbound link", () => {
    render(<PersonCard person={ada} />);

    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("@ada")).toBeTruthy();
    expect(screen.getByText(/2024/)).toBeTruthy();

    const link = screen.getByRole("link", { name: "https://www.instagram.com/ada" });
    expect(link.getAttribute("href")).toBe("https://www.instagram.com/ada");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer noopener");
  });

  it("renders no link when the export carries no username, even if a URL is present", () => {
    render(
      <PersonCard
        person={{
          displayName: "Ada Lovelace",
          username: null,
          profileUrl: "https://www.instagram.com/ada",
          timestamp: null,
        }}
      />,
    );

    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders no link when the username exists but the export carries no profile URL", () => {
    render(<PersonCard person={{ ...ada, profileUrl: null }} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("builds initials from the display name, never from a hash", () => {
    expect(initialsOf("Ada Lovelace")).toBe("AL");
    expect(initialsOf("ada")).toBe("A");
    expect(initialsOf("  ")).toBe("?");
  });
});

describe("PersonListView", () => {
  const people: readonly Person[] = Array.from({ length: 250 }, (_, index) => ({
    displayName: `person ${String(index).padStart(3, "0")}`,
    username: `user${index}`,
    profileUrl: null,
    timestamp: AT(2024, 1, 1),
  }));

  it("renders 200 cards, then one show-more button", () => {
    render(<PersonListView view={viewOf(people)} raw={null} />);

    expect(screen.getAllByRole("article")).toHaveLength(PERSON_PAGE);
    expect(screen.getByText("Showing 200 of 250 people.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show 50 more" })).toBeTruthy();
  });

  it("groups by year when every entry has a date", () => {
    render(<PersonListView view={viewOf([ada])} raw={null} />);

    expect(screen.getByRole("heading", { name: "2024", level: 2 })).toBeTruthy();
  });

  it("does not group when no entry carries a date", () => {
    render(
      <PersonListView
        view={viewOf([
          { ...ada, timestamp: null },
          { ...ada, displayName: "Bea", username: "bea", timestamp: null },
        ])}
        raw={null}
      />,
    );

    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("keeps the first 200-row page under the 2,000-node budget", () => {
    const { container } = render(<PersonListView view={viewOf(people)} raw={null} />);

    expect(container.querySelectorAll(".person-card")).toHaveLength(PERSON_PAGE);
    expect(container.querySelectorAll("*").length).toBeLessThan(2_000);
  });

  it("sorts alphabetically inside a year, as the core orders it", () => {
    render(
      <PersonListView
        view={viewOf([{ ...ada, displayName: "Bea", username: "bea" }, ada])}
        raw={null}
      />,
    );

    const names = screen.getAllByText(/^(Ada Lovelace|Bea)$/).map((node) => node.textContent);
    expect(names).toEqual(["Ada Lovelace", "Bea"]);
  });
});
