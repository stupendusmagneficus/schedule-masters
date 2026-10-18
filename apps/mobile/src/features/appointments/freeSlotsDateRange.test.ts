import { describe, expect, it } from "vitest";
import {
  getDatesInDateRange,
  getFreeSlotsShareRangeError,
  isValidFreeSlotsShareRange,
  MAX_FREE_SLOTS_SHARE_DAYS,
} from "./freeSlotsDateRange";

describe("free slots share date range", () => {
  it("allows one day and the maximum supported range", () => {
    expect(isValidFreeSlotsShareRange("2026-10-18", "2026-10-18")).toBe(true);
    expect(isValidFreeSlotsShareRange("2026-10-18", "2027-01-15")).toBe(true);
    expect(getDatesInDateRange("2026-10-18", "2027-01-15")).toHaveLength(
      MAX_FREE_SLOTS_SHARE_DAYS,
    );
  });

  it("rejects invalid, reversed, and over-limit ranges", () => {
    expect(isValidFreeSlotsShareRange("2026-02-30", "2026-03-01")).toBe(false);
    expect(isValidFreeSlotsShareRange("2026-10-19", "2026-10-18")).toBe(false);
    expect(isValidFreeSlotsShareRange("2026-10-18", "2027-01-16")).toBe(false);
    expect(getFreeSlotsShareRangeError("2026-10-18", "2027-01-16")).toBe(
      "too_long",
    );
    expect(getDatesInDateRange("2026-10-18", "2027-01-16")).toEqual([]);
    expect(getFreeSlotsShareRangeError("2026-10-19", "2026-10-18")).toBe(
      "invalid",
    );
  });
});
