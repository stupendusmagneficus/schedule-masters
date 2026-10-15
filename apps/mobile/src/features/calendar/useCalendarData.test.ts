import { describe, expect, it } from "vitest";

import {
  getAccessibleCalendarLabel,
  getCalendarDateLabel,
  getCalendarWeekLabel,
} from "./useCalendarData";

describe("calendar date labels", () => {
  const currentYear = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Prague",
    year: "numeric",
  }).format(new Date());

  it("formats the day using the selected Czech locale", () => {
    const result = getCalendarDateLabel(`${currentYear}-10-02`, "cz");

    expect(result).toContain("2");
    expect(result).toContain(currentYear);
    expect(result).toContain("října");
  });

  it("formats the selected week using the selected Czech locale", () => {
    const result = getCalendarWeekLabel(`${currentYear}-10-02`, "cz");

    expect(result).toContain("28");
    expect(result).toContain("4");
    expect(result).not.toContain(currentYear);
  });

  it("provides full accessible dates for the selected day", () => {
    expect(
      getAccessibleCalendarLabel("2026-10-02", "day", "cz", "UTC"),
    ).toContain("2026");
  });
});
