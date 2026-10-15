import { describe, expect, it } from "vitest";
import { shouldShowBookingRequests } from "./bookingRequestsVisibility";

describe("shouldShowBookingRequests", () => {
  it("hides pending requests on past dates", () => {
    expect(shouldShowBookingRequests("2026-10-14", "2026-10-15")).toBe(false);
  });

  it("shows pending requests today and on future dates", () => {
    expect(shouldShowBookingRequests("2026-10-15", "2026-10-15")).toBe(true);
    expect(shouldShowBookingRequests("2026-10-16", "2026-10-15")).toBe(true);
  });
});
