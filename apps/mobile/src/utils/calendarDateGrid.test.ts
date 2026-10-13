import { describe, expect, it } from "vitest";
import {
  getCalendarDays,
  getWeekdayLabels,
  isSameCalendarDay,
  moveCalendarMonth,
} from "./calendarDateGrid";

describe("calendar date grid", () => {
  it("starts the week on Sunday in English and Monday in Czech and Russian", () => {
    expect(getWeekdayLabels("en")[0]).toMatch(/^Sun/i);
    expect(getWeekdayLabels("cz")[0]).toMatch(/^po/i);
    expect(getWeekdayLabels("ru")[0]).toMatch(/^пн/i);
  });

  it("returns a continuous six-week grid around the requested month", () => {
    const dates = getCalendarDays(new Date(2024, 1, 20, 12), "en");

    expect(dates).toHaveLength(42);
    expect(dates[0]).toEqual(new Date(2024, 0, 28, 12));
    expect(dates[dates.length - 1]).toEqual(new Date(2024, 2, 9, 12));
    for (let index = 0; index < dates.length - 1; index += 1) {
      const expectedNext = new Date(dates[index]);
      expectedNext.setDate(expectedNext.getDate() + 1);
      expect(dates[index + 1]).toEqual(expectedNext);
    }
  });

  it("moves months without carrying a day from the previous month", () => {
    expect(moveCalendarMonth(new Date(2024, 0, 31, 12), 1)).toEqual(
      new Date(2024, 1, 1, 12),
    );
  });

  it("compares selected dates by calendar day", () => {
    expect(
      isSameCalendarDay(new Date(2024, 1, 29, 8), new Date(2024, 1, 29, 20)),
    ).toBe(true);
    expect(isSameCalendarDay(new Date(2024, 1, 29), new Date(2024, 2, 1))).toBe(
      false,
    );
  });
});
