import { describe, expect, it } from "vitest";

import { getCalendarTimeOptions } from "./calendarTimeOptions";

describe("getCalendarTimeOptions", () => {
  it("offers four quarter-hour choices from a selected calendar time", () => {
    expect(
      getCalendarTimeOptions({
        date: "2030-01-07",
        endMinute: 12 * 60,
        minute: 11 * 60,
        timezone: "Europe/Prague",
      }),
    ).toEqual([
      "2030-01-07T10:00:00.000Z",
      "2030-01-07T10:15:00.000Z",
      "2030-01-07T10:30:00.000Z",
      "2030-01-07T10:45:00.000Z",
    ]);
  });

  it("starts at a tapped half hour and crosses into the next hour", () => {
    expect(
      getCalendarTimeOptions({
        date: "2030-01-07",
        endMinute: 13 * 60,
        minute: 11 * 60 + 30,
        timezone: "Europe/Prague",
      }),
    ).toEqual([
      "2030-01-07T10:30:00.000Z",
      "2030-01-07T10:45:00.000Z",
      "2030-01-07T11:00:00.000Z",
      "2030-01-07T11:15:00.000Z",
    ]);
  });

  it("keeps choices before closing time, including past choices", () => {
    expect(
      getCalendarTimeOptions({
        date: "2030-01-07",
        endMinute: 12 * 60 + 30,
        minute: 11 * 60,
        timezone: "Europe/Prague",
      }),
    ).toEqual([
      "2030-01-07T10:00:00.000Z",
      "2030-01-07T10:15:00.000Z",
      "2030-01-07T10:30:00.000Z",
      "2030-01-07T10:45:00.000Z",
    ]);
  });
});
