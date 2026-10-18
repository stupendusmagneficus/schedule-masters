import { describe, expect, it } from "vitest";

import {
  bookingIntervalOptions,
  isBookingIntervalMinutes,
} from "./bookingInterval";

describe("booking interval options", () => {
  it("offers common quick-pick intervals", () => {
    expect(bookingIntervalOptions).toEqual([15, 30, 45, 60, 90]);
  });

  it("accepts any 5-minute interval from 5 minutes through 7 hours", () => {
    expect(isBookingIntervalMinutes(5)).toBe(true);
    expect(isBookingIntervalMinutes(15)).toBe(true);
    expect(isBookingIntervalMinutes(45)).toBe(true);
    expect(isBookingIntervalMinutes(75)).toBe(true);
    expect(isBookingIntervalMinutes(420)).toBe(true);
  });

  it("rejects values outside the supported range or step", () => {
    expect(isBookingIntervalMinutes(0)).toBe(false);
    expect(isBookingIntervalMinutes(7)).toBe(false);
    expect(isBookingIntervalMinutes(422)).toBe(false);
    expect(isBookingIntervalMinutes(425)).toBe(false);
  });
});
