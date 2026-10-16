import { describe, expect, it } from "vitest";

import type { MasterAppointment } from "../appointments/manualBooking";
import type { PersonalBlock } from "../availability/personalBlocks";
import { buildMonthCalendar } from "./monthCalendar";

const appointment = {
  currency: "CZK",
  customer_id: "customer-1",
  customer_name: "Anna K.",
  duration_minutes: 60,
  ends_at: "2030-02-12T10:00:00.000Z",
  id: "appointment-1",
  price_amount: 700,
  service_name: "Manicure",
  source: "master_created",
  starts_at: "2030-02-12T09:00:00.000Z",
  status: "confirmed",
} as MasterAppointment;

const block = {
  ends_at: "2030-02-12T12:00:00.000Z",
  id: "block-1",
  reason: "Lunch",
  starts_at: "2030-02-12T11:00:00.000Z",
} as PersonalBlock;

describe("month calendar", () => {
  const build = (
    selectedDate: string,
    appointments: MasterAppointment[] = [],
    todayDate = "2030-02-12",
  ) =>
    buildMonthCalendar({
      appointments,
      availabilityRules: [
        { dayOfWeek: 2, endLocalTime: "18:00", startLocalTime: "09:00" },
      ],
      blocks: [],
      monthDate: selectedDate,
      selectedDate,
      timezone: "UTC",
      todayDate,
    });

  it("keeps month rows at six weeks for stable virtualized scrolling", () => {
    const days = build("2021-02-09", [], "2021-02-09");

    expect(days).toHaveLength(42);
    expect(days[0]?.date).toBe("2021-02-01");
    expect(days.at(-1)?.date).toBe("2021-03-14");
    expect(days.find((day) => day.date === "2021-02-09")).toMatchObject({
      isSelected: true,
      isToday: true,
      isClosed: false,
    });
  });

  it("adds leading and trailing days for incomplete weeks across year boundaries", () => {
    const days = build("2030-01-15");

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({
      date: "2029-12-31",
      isCurrentMonth: false,
    });
    expect(days.at(-1)).toMatchObject({
      date: "2030-02-10",
      isCurrentMonth: false,
    });
  });

  it("summarizes bookings, blocks, and expected revenue without counting canceled revenue", () => {
    const canceled = {
      ...appointment,
      id: "appointment-canceled",
      status: "cancelled_by_customer",
    } as MasterAppointment;
    const days = buildMonthCalendar({
      appointments: [appointment, canceled],
      availabilityRules: [
        { dayOfWeek: 2, endLocalTime: "18:00", startLocalTime: "09:00" },
      ],
      blocks: [block],
      monthDate: "2030-02-12",
      selectedDate: "2030-02-12",
      timezone: "UTC",
      todayDate: "2030-02-12",
    });

    expect(days.find((day) => day.date === "2030-02-12")).toMatchObject({
      bookingCount: 1,
      blockCount: 1,
      expectedRevenueByCurrency: { CZK: 700 },
    });
  });

  it("builds each list row for its own month while retaining the selected date", () => {
    const buildRow = (monthDate: string) =>
      buildMonthCalendar({
        appointments: [],
        availabilityRules: [],
        blocks: [],
        monthDate,
        selectedDate: "2026-10-16",
        timezone: "UTC",
        todayDate: "2026-10-16",
      });

    const october = buildRow("2026-10-15");
    const november = buildRow("2026-11-15");

    expect(
      october.find((day) => day.date === "2026-10-01")?.isCurrentMonth,
    ).toBe(true);
    expect(
      november.find((day) => day.date === "2026-11-01")?.isCurrentMonth,
    ).toBe(true);
    expect(october.find((day) => day.isSelected)?.date).toBe("2026-10-16");
    expect(november.find((day) => day.isSelected)).toBeUndefined();
  });

  it("represents an empty month’s days as free or closed, not as missing cells", () => {
    const days = build("2030-02-12");

    expect(
      days.every((day) => day.bookingCount === 0 && day.blockCount === 0),
    ).toBe(true);
    expect(days.find((day) => day.date === "2030-02-11")?.isClosed).toBe(true);
    expect(days.find((day) => day.date === "2030-02-12")?.isClosed).toBe(false);
  });
});
