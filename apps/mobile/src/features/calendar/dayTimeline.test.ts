import { describe, expect, it } from "vitest";

import type { MasterAppointment } from "../appointments/manualBooking";
import type { PersonalBlock } from "../availability/personalBlocks";
import {
  buildDayTimeline,
  buildDemoDayTimeline,
  getDayTimelineSlotStart,
} from "./dayTimeline";

const appointment = {
  customer_id: "customer-1",
  customer_name: "Anna K.",
  currency: "CZK",
  duration_minutes: 90,
  ends_at: "2026-09-28T09:00:00.000Z",
  id: "appointment-1",
  price_amount: 700,
  service_name: "Gel manicure",
  source: "master_created",
  starts_at: "2026-09-28T07:30:00.000Z",
  status: "confirmed",
} as MasterAppointment;

const block = {
  ends_at: "2026-09-28T12:00:00.000Z",
  id: "block-1",
  reason: "Lunch",
  starts_at: "2026-09-28T10:00:00.000Z",
} as PersonalBlock;

describe("day timeline", () => {
  it("creates a 30-minute grid from the configured working hours", () => {
    const timeline = buildDayTimeline({
      appointments: [],
      availabilityRules: [
        { dayOfWeek: 1, endLocalTime: "18:00", startLocalTime: "09:00" },
      ],
      blocks: [],
      selectedDate: "2026-09-28",
      timezone: "Europe/Prague",
    });

    expect(timeline.isClosed).toBe(false);
    expect(timeline.startMinute).toBe(540);
    expect(timeline.endMinute).toBe(1080);
    expect(timeline.slots).toHaveLength(18);
    expect(timeline.slots[0]).toEqual({ label: "09:00", minute: 540 });
    expect(timeline.slots.at(-1)).toEqual({ label: "17:30", minute: 1050 });
  });

  it("places appointments and personal blocks on the selected local day", () => {
    const timeline = buildDayTimeline({
      appointments: [appointment],
      availabilityRules: [
        { dayOfWeek: 1, endLocalTime: "18:00", startLocalTime: "09:00" },
      ],
      blocks: [block],
      selectedDate: "2026-09-28",
      timezone: "Europe/Prague",
    });

    expect(timeline.events).toEqual([
      expect.objectContaining({
        endMinute: 660,
        id: "appointment-1",
        kind: "appointment",
        startMinute: 570,
      }),
      expect.objectContaining({
        endMinute: 840,
        id: "block-1",
        kind: "block",
        startMinute: 720,
      }),
    ]);
  });

  it("returns a closed state when no rule exists for the date", () => {
    const timeline = buildDayTimeline({
      appointments: [],
      availabilityRules: [
        { dayOfWeek: 1, endLocalTime: "18:00", startLocalTime: "09:00" },
      ],
      blocks: [],
      selectedDate: "2026-09-27",
      timezone: "Europe/Prague",
    });

    expect(timeline).toMatchObject({ isClosed: true, slots: [], events: [] });
  });

  it("converts a local timeline slot to an ISO instant", () => {
    expect(
      getDayTimelineSlotStart("2026-09-28", 10 * 60 + 30, "Europe/Prague"),
    ).toBe("2026-09-28T08:30:00.000Z");
  });

  it("supports the demo timeline without a Supabase client", () => {
    const timeline = buildDemoDayTimeline([
      {
        clientName: "Anna K.",
        durationMinutes: 90,
        id: "demo-1",
        initials: "AK",
        priceAmount: 700,
        serviceName: "Gel manicure",
        startsAt: "09:30",
        status: "confirmed",
      },
    ]);

    expect(timeline.events[0]).toMatchObject({
      endMinute: 660,
      startMinute: 570,
      title: "Anna K.",
    });
  });
});
