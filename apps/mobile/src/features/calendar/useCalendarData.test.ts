import { describe, expect, it } from "vitest";

import { getCalendarDateLabel } from "./useCalendarData";

describe("calendar date labels", () => {
  it("formats the day using the selected Czech locale", () => {
    expect(getCalendarDateLabel("2026-10-02", "cz")).toBe(
      "pátek 2. října 2026",
    );
  });
});
