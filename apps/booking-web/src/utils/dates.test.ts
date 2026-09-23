import { describe, expect, it } from "vitest";

import {
  getFollowingBookableDate,
  getNextBookableDate,
  parseDateInput,
} from "./dates";

describe("booking dates", () => {
  it("skips weekends when selecting the next bookable date", () => {
    expect(getNextBookableDate(new Date("2026-09-04T12:00:00Z"))).toBe(
      "2026-09-07",
    );
  });

  it("skips weekends when moving to another date", () => {
    expect(getFollowingBookableDate("2026-09-05")).toBe("2026-09-07");
  });

  it("parses an input date without shifting the local calendar day", () => {
    const parsed = parseDateInput("2030-01-07");

    expect(parsed.getFullYear()).toBe(2030);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(7);
  });
});
