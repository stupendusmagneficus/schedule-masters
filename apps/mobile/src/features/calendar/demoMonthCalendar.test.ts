import { describe, expect, it } from "vitest";
import { buildDemoMonthCalendar } from "./demoMonthCalendar";

describe("demo month calendar", () => {
  it("highlights the active selected date within each month grid", () => {
    const days = buildDemoMonthCalendar(
      [],
      "2026-10-15",
      "2026-10-16",
      "2026-10-16",
    );

    expect(days.find((day) => day.date === "2026-10-15")?.isSelected).toBe(
      false,
    );
    expect(days.find((day) => day.date === "2026-10-16")?.isSelected).toBe(
      true,
    );
  });
});
