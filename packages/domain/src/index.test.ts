import { describe, expect, it } from "vitest";
import { bookingStatuses, canTransitionBooking } from "./index";

describe("domain scaffold", () => {
  it("exposes the initial booking status vocabulary", () => {
    expect(bookingStatuses).toContain("confirmed");
    expect(bookingStatuses).toContain("cancelled_by_master");
  });

  it("allows only supported lifecycle transitions", () => {
    expect(canTransitionBooking("pending", "confirmed")).toBe(true);
    expect(canTransitionBooking("confirmed", "completed")).toBe(true);
    expect(canTransitionBooking("confirmed", "pending")).toBe(false);
    expect(canTransitionBooking("completed", "no_show")).toBe(false);
  });
});
