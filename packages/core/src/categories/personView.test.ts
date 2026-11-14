import { describe, expect, it } from "vitest";

import { groupPeopleByYear, toPerson, toPersonView, type Person } from "./personView.js";

const AT = (year: number, month: number, day: number): number =>
  Date.UTC(year, month - 1, day, 12, 0, 0) / 1000;

function labelPerson(name: string, username: string, url = ""): Record<string, unknown> {
  return {
    timestamp: AT(2024, 5, 1),
    media: [],
    label_values: [
      { label: "URL", value: url },
      { label: "Name", value: name },
      { label: "Username", value: username },
    ],
  };
}

function follower(
  username: string,
  href: string,
  timestamp: number | null,
): Record<string, unknown> {
  return {
    title: "",
    media_list_data: [],
    string_list_data: [{ href, value: username, ...(timestamp === null ? {} : { timestamp }) }],
  };
}

describe("toPerson — label/value interactions", () => {
  it("maps Name, Username and the entry timestamp", () => {
    const person = toPerson(labelPerson("Ada Lovelace", "ada"));

    expect(person).toEqual({
      displayName: "Ada Lovelace",
      username: "ada",
      profileUrl: null,
      timestamp: AT(2024, 5, 1),
    });
  });

  it("does not treat a personal website as the profile URL", () => {
    const person = toPerson(labelPerson("Ada Lovelace", "ada", "https://example.com/ada"));
    expect(person?.profileUrl).toBeNull();
  });

  it("accepts a measured Instagram profile URL when the path is the username", () => {
    const person = toPerson(labelPerson("Ada Lovelace", "ada", "https://www.instagram.com/ada"));
    expect(person?.profileUrl).toBe("https://www.instagram.com/ada");
  });

  it("returns no person when the entry has no username", () => {
    const entry = labelPerson("Ada Lovelace", "");
    expect(toPerson(entry)).toBeNull();
  });
});

describe("toPerson — string_list_data identities", () => {
  it("reads the follower shape: value is the username, title is empty", () => {
    const person = toPerson(follower("ada", "https://www.instagram.com/ada", AT(2019, 1, 2)));

    expect(person).toEqual({
      displayName: "ada",
      username: "ada",
      profileUrl: "https://www.instagram.com/ada",
      timestamp: AT(2019, 1, 2),
    });
  });

  it("reads the following shape: title is the username and there is no value", () => {
    const entry = {
      title: "ada",
      string_list_data: [{ href: "https://www.instagram.com/_u/ada", timestamp: AT(2020, 3, 4) }],
    };
    expect(toPerson(entry)).toEqual({
      displayName: "ada",
      username: "ada",
      profileUrl: "https://www.instagram.com/_u/ada",
      timestamp: AT(2020, 3, 4),
    });
  });

  it("reads a Threads profile URL and timestamp", () => {
    const entry = {
      string_list_data: [
        { href: "https://www.threads.com/ada", value: "ada", timestamp: AT(2023, 7, 6) },
      ],
    };
    expect(toPerson(entry)?.profileUrl).toBe("https://www.threads.com/ada");
  });

  it("rejects a non-profile href rather than linking a page that is not the person", () => {
    const entry = follower("ada", "https://example.com/ada", AT(2019, 1, 2));
    expect(toPerson(entry)?.profileUrl).toBeNull();
  });

  it("keeps a person whose entry has no date", () => {
    expect(toPerson(follower("ada", "https://www.instagram.com/ada", null))?.timestamp).toBeNull();
  });
});

describe("toPersonView — category assignment", () => {
  it("returns null for a hashtag record, whose entry shape is a follower's", () => {
    const view = toPersonView({
      id: "following_hashtags",
      data: {
        relationships_following_hashtags: [
          follower("#t", "https://www.instagram.com/t", AT(2020, 1, 1)),
        ],
      },
    });
    expect(view).toBeNull();
  });

  it("returns null for synced contacts: no username exists to build a person from", () => {
    const view = toPersonView({
      id: "synced_contacts",
      data: { contacts_contact_info: [{ string_map_data: { "First Name": { value: "Ada" } } }] },
    });
    expect(view).toBeNull();
  });

  it("returns null when no entry in a person category carries a username", () => {
    expect(
      toPersonView({
        id: "followers",
        data: [follower("", "https://www.instagram.com/x", AT(2020, 1, 1))],
      }),
    ).toBeNull();
  });
});

describe("toPersonView — ordering and the year fold", () => {
  const people: readonly Person[] = [
    { displayName: "zoe", username: "zoe", profileUrl: null, timestamp: AT(2020, 5, 1) },
    { displayName: "Ada", username: "ada", profileUrl: null, timestamp: AT(2022, 5, 1) },
    { displayName: "bea", username: "bea", profileUrl: null, timestamp: AT(2020, 1, 1) },
    { displayName: "Cy", username: "cy", profileUrl: null, timestamp: null },
  ];

  it("groups years newest first and sorts names alphabetically inside a year", () => {
    const { years, undated } = groupPeopleByYear(people);

    expect(years.map((year) => year.key)).toEqual(["2022", "2020"]);
    expect(years[1]?.people.map((person) => person.displayName)).toEqual(["bea", "zoe"]);
    expect(undated.map((person) => person.displayName)).toEqual(["Cy"]);
  });

  it("puts undated people last and reports whether any date exists", () => {
    const view = toPersonView({
      id: "followers",
      data: [
        follower("zoe", "https://www.instagram.com/zoe", AT(2020, 5, 1)),
        follower("ada", "https://www.instagram.com/ada", null),
      ],
    });

    expect(view?.people.map((person) => person.username)).toEqual(["zoe", "ada"]);
    expect(view?.hasDates).toBe(true);
    expect(view?.years[0]?.key).toBe("2020");
  });

  it("does not group when no entry carries a date", () => {
    const view = toPersonView({
      id: "followers",
      data: [
        follower("zoe", "https://www.instagram.com/zoe", null),
        follower("ada", "https://www.instagram.com/ada", null),
      ],
    });

    expect(view?.hasDates).toBe(false);
    expect(view?.years).toEqual([]);
    expect(view?.people.map((person) => person.username)).toEqual(["ada", "zoe"]);
  });

  it("is deterministic for the same input", () => {
    const record = {
      id: "following",
      data: [
        {
          title: "b",
          string_list_data: [{ href: "https://www.instagram.com/_u/b", timestamp: AT(2021, 1, 1) }],
        },
        {
          title: "a",
          string_list_data: [{ href: "https://www.instagram.com/_u/a", timestamp: AT(2021, 1, 1) }],
        },
      ],
    };
    expect(toPersonView(record)).toEqual(toPersonView(record));
  });
});
