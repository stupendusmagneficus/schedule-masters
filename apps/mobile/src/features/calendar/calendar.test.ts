import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  getCalendarDateRange,
  isCalendarDate,
  moveCalendarDate,
} from "./calendar";

describe("calendar date ranges", () => {
  it("returns one day for the day view", () => {
    expect(getCalendarDateRange("2030-01-08", "day")).toEqual({
      fromDate: "2030-01-08",
      toDate: "2030-01-08",
    });
  });

  it("returns a Monday-to-Sunday range for the week view", () => {
    expect(getCalendarDateRange("2030-01-09", "week")).toEqual({
      fromDate: "2030-01-07",
      toDate: "2030-01-13",
    });
  });

  it("returns the complete month for the month view", () => {
    expect(getCalendarDateRange("2030-02-12", "month")).toEqual({
      fromDate: "2030-02-01",
      toDate: "2030-02-28",
    });
  });

  it("uses a bounded upcoming range for the feed view", () => {
    expect(getCalendarDateRange("2030-02-12", "feed")).toEqual({
      fromDate: "2030-02-12",
      toDate: "2030-05-12",
    });
  });
});

describe("calendar navigation", () => {
  it.each([
    ["day", "2030-01-08", "2030-01-09"],
    ["week", "2030-01-08", "2030-01-15"],
    ["month", "2030-01-08", "2030-02-01"],
    ["feed", "2030-01-08", "2030-02-07"],
  ] as const)("moves forward in the %s view", (view, date, expected) => {
    expect(moveCalendarDate(date, view, 1)).toBe(expected);
  });

  it("handles month and year boundaries", () => {
    expect(addCalendarDays("2030-01-01", -1)).toBe("2029-12-31");
    expect(moveCalendarDate("2030-01-31", "month", 1)).toBe("2030-02-01");
  });
});

describe("calendar date validation", () => {
  it.each(["2030-02-30", "2030-1-01", "not-a-date"])("rejects %s", (value) => {
    expect(isCalendarDate(value)).toBe(false);
  });

  it("accepts a real ISO calendar date", () => {
    expect(isCalendarDate("2030-02-28")).toBe(true);
  });
});
