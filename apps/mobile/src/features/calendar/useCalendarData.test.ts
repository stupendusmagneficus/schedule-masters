import { describe, expect, it } from "vitest";

import { getCalendarDateLabel, getCalendarWeekLabel } from "./useCalendarData";

describe("calendar date labels", () => {
  it("formats the day using the selected Czech locale", () => {
    expect(getCalendarDateLabel("2026-10-02", "cz")).toBe(
      "pátek 2. října 2026",
    );
  });

  it("formats the selected week using the selected Czech locale", () => {
    expect(getCalendarWeekLabel("2026-10-02", "cz")).toBe(
      "28. 9. 2026 – 4. 10. 2026",
    );
  });
});
