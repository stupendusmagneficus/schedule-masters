import { describe, expect, it } from "vitest";

import { groupWeekCalendarSlots } from "./weekCalendarTouchTarget";

describe("week calendar touch target sizing", () => {
  it("groups adjacent half-hour rows into non-overlapping 48pt targets", () => {
    const groups = groupWeekCalendarSlots([
      9 * 60,
      9 * 60 + 30,
      10 * 60,
      10 * 60 + 30,
    ]);

    expect(groups).toEqual([
      {
        endMinute: 10 * 60,
        minutes: [9 * 60, 9 * 60 + 30],
        startMinute: 9 * 60,
        touchTargetHeight: 48,
      },
      {
        endMinute: 11 * 60,
        minutes: [10 * 60, 10 * 60 + 30],
        startMinute: 10 * 60,
        touchTargetHeight: 48,
      },
    ]);
  });

  it("keeps the final half-hour selectable with a target at least 44pt high", () => {
    const groups = groupWeekCalendarSlots([9 * 60, 9 * 60 + 30, 10 * 60]);

    expect(groups[1]).toMatchObject({
      minutes: [10 * 60],
      touchTargetHeight: 44,
    });
  });
});
