import { describe, expect, it } from "vitest";
import type { MonthAvailableSlot } from "./manualBooking";
import {
  buildMonthAvailabilityCalendar,
  getAvailableDates,
} from "./monthAvailability";

const slot = (date: string, time = "09:00"): MonthAvailableSlot => ({
  available_date: date,
  ends_at: `${date}T${time}:00.000Z`,
  starts_at: `${date}T${time}:00.000Z`,
});

describe("month availability calendar", () => {
  it("builds a Monday-first month grid and groups real slots by date", () => {
    const calendar = buildMonthAvailabilityCalendar("2030-01-18", [
      slot("2030-01-03"),
      slot("2030-01-03", "10:00"),
      slot("2030-01-14"),
    ]);

    expect(calendar.dates[0]).toBe("2029-12-31");
    expect(calendar.dates.at(-1)).toBe("2030-02-03");
    expect(calendar.slotsByDate.get("2030-01-03")).toHaveLength(2);
    expect(getAvailableDates(calendar.slotsByDate)).toEqual(
      new Set(["2030-01-03", "2030-01-14"]),
    );
  });

  it("returns no available dates when the shared contract returns no slots", () => {
    const calendar = buildMonthAvailabilityCalendar("2030-02-01", []);

    expect(getAvailableDates(calendar.slotsByDate).size).toBe(0);
  });
});
