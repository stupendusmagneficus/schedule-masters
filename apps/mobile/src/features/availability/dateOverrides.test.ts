import { describe, expect, it } from "vitest";
import type { MasterAppointment } from "../appointments/manualBooking";
import {
  type AvailabilityDateOverride,
  findAvailabilityConflicts,
  getEffectiveAvailability,
  isValidAvailabilityOverrideDraft,
} from "./dateOverrides";

const weeklyRule = {
  dayOfWeek: 1,
  startLocalTime: "09:00",
  endLocalTime: "17:00",
};

describe("date-specific availability", () => {
  it("rejects invalid hours and accepts a closed date", () => {
    expect(
      isValidAvailabilityOverrideDraft({
        date: "2030-01-07",
        endLocalTime: "09:00",
        kind: "modified",
        startLocalTime: "09:00",
      }),
    ).toBe(false);
    expect(
      isValidAvailabilityOverrideDraft({
        date: "2030-01-07",
        endLocalTime: null,
        kind: "closed",
        startLocalTime: null,
      }),
    ).toBe(true);
  });

  it("uses a closed override instead of the weekly rule", () => {
    expect(
      getEffectiveAvailability(
        "2030-01-07",
        [weeklyRule],
        [
          {
            work_date: "2030-01-07",
            override_kind: "closed",
            start_local_time: null,
            end_local_time: null,
          },
        ],
      ),
    ).toEqual({ isClosed: true, startLocalTime: null, endLocalTime: null });
  });

  it("uses modified hours and falls back to weekly hours after reset", () => {
    const override: AvailabilityDateOverride = {
      work_date: "2030-01-07",
      override_kind: "modified",
      start_local_time: "12:00:00",
      end_local_time: "16:00:00",
    };
    expect(
      getEffectiveAvailability("2030-01-07", [weeklyRule], [override]),
    ).toEqual({
      isClosed: false,
      startLocalTime: "12:00:00",
      endLocalTime: "16:00:00",
    });
    expect(getEffectiveAvailability("2030-01-07", [weeklyRule], [])).toEqual({
      isClosed: false,
      startLocalTime: "09:00",
      endLocalTime: "17:00",
    });
  });

  it("reports appointments outside the proposed hours without changing them", () => {
    const appointment = {
      customer_id: "client-1",
      customer_name: "Anna",
      ends_at: "2030-01-07T17:00:00.000Z",
      id: "booking-1",
      starts_at: "2030-01-07T15:00:00.000Z",
      status: "confirmed",
    } as MasterAppointment;

    expect(
      findAvailabilityConflicts([appointment], {
        date: "2030-01-07",
        endLocalTime: "16:00",
        kind: "modified",
        startLocalTime: "09:00",
        timezone: "UTC",
      }),
    ).toEqual([appointment]);
    expect(
      findAvailabilityConflicts([appointment], {
        date: "2030-01-07",
        endLocalTime: null,
        kind: "closed",
        startLocalTime: null,
        timezone: "UTC",
      }),
    ).toEqual([appointment]);
  });
});
