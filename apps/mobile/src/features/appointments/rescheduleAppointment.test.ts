import { describe, expect, it } from "vitest";

import { canRescheduleAppointment } from "./rescheduleAppointment";

const now = new Date("2030-01-07T10:00:00.000Z");

describe("canRescheduleAppointment", () => {
  it("allows moving pending and confirmed bookings that have not started", () => {
    for (const status of ["pending", "confirmed"] as const) {
      expect(
        canRescheduleAppointment(
          { starts_at: "2030-01-07T11:00:00.000Z", status },
          now,
        ),
      ).toBe(true);
    }
  });

  it("does not move bookings that already started", () => {
    expect(
      canRescheduleAppointment(
        { starts_at: "2030-01-07T10:00:00.000Z", status: "confirmed" },
        now,
      ),
    ).toBe(false);
  });

  it("does not move finished or cancelled bookings", () => {
    for (const status of [
      "completed",
      "no_show",
      "cancelled_by_master",
      "cancelled_by_customer",
    ] as const) {
      expect(
        canRescheduleAppointment(
          { starts_at: "2030-01-08T11:00:00.000Z", status },
          now,
        ),
      ).toBe(false);
    }
  });
});
