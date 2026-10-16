import { describe, expect, it } from "vitest";

import { CalendarMonthCache } from "./calendarMonthCache";

describe("calendar month cache", () => {
  it("reuses visited months and evicts the least recently used month", () => {
    const cache = new CalendarMonthCache<string>(2);
    cache.set("2026-09", "september data");
    cache.set("2026-10", "october data");

    expect(cache.get("2026-09")).toBe("september data");
    cache.set("2026-11", "november data");

    expect(cache.get("2026-09")).toBe("september data");
    expect(cache.get("2026-10")).toBeUndefined();
    expect(cache.size).toBe(2);
  });
});
