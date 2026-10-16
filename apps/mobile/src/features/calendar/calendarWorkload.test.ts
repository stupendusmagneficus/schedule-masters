import { describe, expect, it } from "vitest";
import type { WorkspaceAvailabilityRule } from "../../types";
import type { MasterAppointment } from "../appointments/manualBooking";
import type { PersonalBlock } from "../availability/personalBlocks";
import { calculateCalendarWorkload } from "./calendarWorkload";

const rule = {
  dayOfWeek: 2,
  endLocalTime: "11:00",
  startLocalTime: "09:00",
} satisfies WorkspaceAvailabilityRule;

function appointment(
  id: string,
  startsAt: string,
  endsAt: string,
  status:
    | "cancelled_by_customer"
    | "completed"
    | "confirmed"
    | "pending" = "confirmed",
) {
  return {
    ends_at: endsAt,
    id,
    starts_at: startsAt,
    status,
  } as MasterAppointment;
}

function block(id: string, startsAt: string, endsAt: string) {
  return { ends_at: endsAt, id, starts_at: startsAt } as PersonalBlock;
}

describe("calculateCalendarWorkload", () => {
  it("counts the union of accepted appointments and subtracts personal blocks", () => {
    const workload = calculateCalendarWorkload({
      appointments: [
        appointment(
          "one",
          "2030-02-12T09:00:00.000Z",
          "2030-02-12T10:30:00.000Z",
        ),
        appointment(
          "two",
          "2030-02-12T10:00:00.000Z",
          "2030-02-12T11:00:00.000Z",
        ),
        appointment(
          "pending",
          "2030-02-12T09:00:00.000Z",
          "2030-02-12T11:00:00.000Z",
          "pending",
        ),
        appointment(
          "cancelled",
          "2030-02-12T09:00:00.000Z",
          "2030-02-12T11:00:00.000Z",
          "cancelled_by_customer",
        ),
      ],
      availabilityRule: rule,
      blocks: [
        block("lunch", "2030-02-12T10:30:00.000Z", "2030-02-12T11:00:00.000Z"),
      ],
      date: "2030-02-12",
      timezone: "UTC",
    });

    expect(workload).toEqual({
      availableMinutes: 90,
      bookedMinutes: 90,
      percent: 100,
    });
  });

  it("uses workspace local time and clips appointments to working hours", () => {
    const workload = calculateCalendarWorkload({
      appointments: [
        appointment(
          "before-hours",
          "2030-02-12T06:30:00.000Z",
          "2030-02-12T07:30:00.000Z",
        ),
        appointment(
          "local",
          "2030-02-12T08:00:00.000Z",
          "2030-02-12T09:30:00.000Z",
        ),
      ],
      availabilityRule: rule,
      blocks: [],
      date: "2030-02-12",
      timezone: "Europe/Prague",
    });

    expect(workload).toEqual({
      availableMinutes: 120,
      bookedMinutes: 90,
      percent: 75,
    });
  });

  it("does not invent a percentage for closed or fully blocked days", () => {
    const closed = calculateCalendarWorkload({
      appointments: [],
      availabilityRule: undefined,
      blocks: [],
      date: "2030-02-12",
      timezone: "UTC",
    });
    const blocked = calculateCalendarWorkload({
      appointments: [],
      availabilityRule: rule,
      blocks: [
        block(
          "all-day",
          "2030-02-12T09:00:00.000Z",
          "2030-02-12T11:00:00.000Z",
        ),
      ],
      date: "2030-02-12",
      timezone: "UTC",
    });

    expect(closed.percent).toBeNull();
    expect(blocked).toEqual({
      availableMinutes: 0,
      bookedMinutes: 0,
      percent: null,
    });
  });
});
