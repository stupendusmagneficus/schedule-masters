import { describe, expect, it } from "vitest";

import {
  appendCalendarMonths,
  createInitialMonthWindow,
  getCalendarMonth,
  isMonthRequestCurrent,
  prependCalendarMonths,
  shiftCalendarMonth,
} from "./monthWindow";

describe("calendar month windows", () => {
  it("creates a bounded window around the selected month", () => {
    expect(createInitialMonthWindow("2026-10-16")).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(getCalendarMonth("2026-10-16")).toBe("2026-10");
  });

  it("moves months across year boundaries in both directions", () => {
    expect(shiftCalendarMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftCalendarMonth("2025-12", 1)).toBe("2026-01");
  });

  it("pages both edges without duplicates and bounds the rendered window", () => {
    const initial = createInitialMonthWindow("2026-10-16");
    const previous = prependCalendarMonths(initial);
    const next = appendCalendarMonths(initial);

    expect(previous.slice(0, 2)).toEqual(["2026-07", "2026-08"]);
    expect(next.slice(-2)).toEqual(["2026-12", "2027-01"]);
    expect(new Set(previous).size).toBe(previous.length);
    expect(new Set(next).size).toBe(next.length);
    expect(prependCalendarMonths(previous)).toHaveLength(7);
    expect(
      appendCalendarMonths(
        appendCalendarMonths(
          appendCalendarMonths(appendCalendarMonths(initial)),
        ),
      ),
    ).toHaveLength(11);
  });

  it("ignores cancelled workspace requests and months outside the active window", () => {
    expect(isMonthRequestCurrent(3, 3, ["2026-09", "2026-10"], "2026-10")).toBe(
      true,
    );
    expect(isMonthRequestCurrent(2, 3, ["2026-09", "2026-10"], "2026-10")).toBe(
      false,
    );
    expect(isMonthRequestCurrent(3, 3, ["2026-09", "2026-10"], "2026-08")).toBe(
      false,
    );
  });
});
