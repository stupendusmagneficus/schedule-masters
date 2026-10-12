import { describe, expect, it } from "vitest";

import type { MasterAppointment } from "../appointments/manualBooking";
import type { PersonalBlock } from "../availability/personalBlocks";
import {
  buildDemoWeekCalendar,
  buildWeekCalendar,
  buildWeekCalendarMonth,
} from "./weekCalendar";

const appointment = {
  currency: "CZK",
  customer_id: "customer-1",
  customer_name: "Anna K.",
  duration_minutes: 60,
  ends_at: "2030-01-09T10:00:00.000Z",
  id: "appointment-1",
  price_amount: 700,
  service_name: "Manicure",
  source: "master_created",
  starts_at: "2030-01-09T09:00:00.000Z",
  status: "confirmed",
} as MasterAppointment;

const block = {
  ends_at: "2030-01-10T12:00:00.000Z",
  id: "block-1",
  reason: "Lunch",
  starts_at: "2030-01-10T11:00:00.000Z",
} as PersonalBlock;

describe("week calendar", () => {
  it("creates seven Monday-to-Sunday days with events grouped by local date", () => {
    const week = buildWeekCalendar({
      appointments: [appointment],
      availabilityRules: [
        { dayOfWeek: 3, endLocalTime: "18:00", startLocalTime: "09:00" },
        { dayOfWeek: 4, endLocalTime: "18:00", startLocalTime: "09:00" },
      ],
      blocks: [block],
      selectedDate: "2030-01-09",
      timezone: "Europe/Prague",
    });

    expect(week).toHaveLength(7);
    expect(week.map((day) => day.date)).toEqual([
      "2030-01-07",
      "2030-01-08",
      "2030-01-09",
      "2030-01-10",
      "2030-01-11",
      "2030-01-12",
      "2030-01-13",
    ]);
    expect(week[2]?.events[0]).toMatchObject({
      id: "appointment-1",
      title: "Anna K.",
    });
    expect(week[3]?.events[0]).toMatchObject({
      id: "block-1",
      title: "Lunch",
    });
    expect(week[0]?.isClosed).toBe(true);
    expect(week[2]?.isClosed).toBe(false);
  });

  it("distributes demo appointments across the selected week", () => {
    const week = buildDemoWeekCalendar(
      [
        {
          clientName: "Anna K.",
          durationMinutes: 60,
          id: "demo-1",
          initials: "AK",
          priceAmount: 700,
          serviceName: "Manicure",
          startsAt: "09:00",
          status: "confirmed",
        },
        {
          clientName: "Maria P.",
          durationMinutes: 90,
          id: "demo-2",
          initials: "MP",
          priceAmount: 900,
          serviceName: "Pedicure",
          startsAt: "13:00",
          status: "pending",
        },
      ],
      "2030-01-09",
      "Europe/Prague",
    );

    expect(week[0]?.events[0]?.title).toBe("Anna K.");
    expect(week[1]?.events[0]?.title).toBe("Maria P.");
  });

  it("builds a compact month grid with the selected week highlighted", () => {
    const week = buildDemoWeekCalendar([], "2030-01-09", "Europe/Prague");
    const month = buildWeekCalendarMonth("2030-01-09", week);

    expect(month).toHaveLength(35);
    expect(month[0]).toMatchObject({
      date: "2029-12-31",
      isCurrentMonth: false,
      isSelectedWeek: false,
    });
    expect(month.find((day) => day.date === "2030-01-09")).toMatchObject({
      dayOfMonth: 9,
      isCurrentMonth: true,
      isSelectedWeek: true,
    });
    expect(
      month.filter((day) => day.isSelectedWeek).map((day) => day.date),
    ).toEqual([
      "2030-01-07",
      "2030-01-08",
      "2030-01-09",
      "2030-01-10",
      "2030-01-11",
      "2030-01-12",
      "2030-01-13",
    ]);
  });
});
