import { describe, expect, it } from "vitest";

import {
  bookingIntervalOptions,
  isBookingIntervalMinutes,
} from "./bookingInterval";

describe("booking interval options", () => {
  it("offers a 30-minute default and practical shorter or longer steps", () => {
    expect(bookingIntervalOptions).toEqual([15, 30, 60]);
  });

  it("accepts only supported interval values", () => {
    expect(isBookingIntervalMinutes(15)).toBe(true);
    expect(isBookingIntervalMinutes(30)).toBe(true);
    expect(isBookingIntervalMinutes(60)).toBe(true);
    expect(isBookingIntervalMinutes(0)).toBe(false);
    expect(isBookingIntervalMinutes(45)).toBe(false);
  });
});
