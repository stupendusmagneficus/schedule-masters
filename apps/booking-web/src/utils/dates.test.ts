import { describe, expect, it } from "vitest";

import { getFollowingBookableDate, getNextBookableDate } from "./dates";

describe("booking dates", () => {
  it("skips weekends when selecting the next bookable date", () => {
    expect(getNextBookableDate(new Date("2026-09-04T12:00:00Z"))).toBe(
      "2026-09-07",
    );
  });

  it("skips weekends when moving to another date", () => {
    expect(getFollowingBookableDate("2026-09-05")).toBe("2026-09-07");
  });
});
