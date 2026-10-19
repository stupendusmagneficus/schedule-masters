import { describe, expect, it } from "vitest";
import {
  buildWeeklyAvailabilityDrafts,
  getIsoWeekdaysForDates,
  isValidWeeklyAvailabilityDraft,
} from "./weeklySchedule";

describe("weekly schedule helpers", () => {
  it("deduplicates dates into sorted ISO weekdays", () => {
    expect(
      getIsoWeekdaysForDates([
        "2026-10-18",
        "2026-10-19",
        "2026-10-23",
        "2026-10-19",
      ]),
    ).toEqual([1, 5, 7]);
  });

  it("builds weekly open and closed rules", () => {
    expect(
      buildWeeklyAvailabilityDrafts([5, 1, 5], "modified", "09:00", "17:00"),
    ).toEqual([
      {
        dayOfWeek: 1,
        kind: "modified",
        startLocalTime: "09:00",
        endLocalTime: "17:00",
      },
      {
        dayOfWeek: 5,
        kind: "modified",
        startLocalTime: "09:00",
        endLocalTime: "17:00",
      },
    ]);
    expect(
      buildWeeklyAvailabilityDrafts([7], "closed", "09:00", "17:00"),
    ).toEqual([
      {
        dayOfWeek: 7,
        kind: "closed",
        startLocalTime: null,
        endLocalTime: null,
      },
    ]);
  });

  it("validates weekdays and increasing local times", () => {
    expect(
      isValidWeeklyAvailabilityDraft({
        dayOfWeek: 1,
        kind: "modified",
        startLocalTime: "09:00",
        endLocalTime: "17:00",
      }),
    ).toBe(true);
    expect(
      isValidWeeklyAvailabilityDraft({
        dayOfWeek: 1,
        kind: "modified",
        startLocalTime: "17:00",
        endLocalTime: "09:00",
      }),
    ).toBe(false);
    expect(
      isValidWeeklyAvailabilityDraft({
        dayOfWeek: 8,
        kind: "closed",
        startLocalTime: null,
        endLocalTime: null,
      }),
    ).toBe(false);
  });
});
