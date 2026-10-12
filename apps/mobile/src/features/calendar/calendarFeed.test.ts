import { describe, expect, it } from "vitest";

import type { MasterAppointment } from "../appointments/manualBooking";
import type { PersonalBlock } from "../availability/personalBlocks";
import { buildCalendarFeed, formatCalendarFeedDate } from "./calendarFeed";

const appointment = (
  overrides: Partial<MasterAppointment> & Pick<MasterAppointment, "id" | "starts_at" | "ends_at">,
): MasterAppointment => ({
  currency: "CZK",
  customer_id: "customer-1",
  customer_name: "Jana Nováková",
  duration_minutes: 60,
  price_amount: 1200,
  service_name: "Manikúra",
  source: "master_created",
  status: "confirmed",
  ...overrides,
});

const block = (
  overrides: Partial<PersonalBlock> & Pick<PersonalBlock, "id" | "starts_at" | "ends_at">,
): PersonalBlock => ({
  reason: "Pauza",
  ...overrides,
});

describe("calendar feed", () => {
  it("groups and chronologically sorts mixed appointments and blocks", () => {
    const groups = buildCalendarFeed({
      appointments: [
        appointment({
          ends_at: "2026-10-02T10:00:00.000Z",
          id: "later",
          starts_at: "2026-10-02T09:00:00.000Z",
        }),
        appointment({
          ends_at: "2026-10-02T08:30:00.000Z",
          id: "earlier",
          starts_at: "2026-10-02T08:00:00.000Z",
        }),
      ],
      blocks: [
        block({
          ends_at: "2026-10-02T09:00:00.000Z",
          id: "break",
          starts_at: "2026-10-02T08:30:00.000Z",
        }),
      ],
      filter: "all",
      now: new Date("2026-10-01T00:00:00.000Z"),
      timezone: "UTC",
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.date).toBe("2026-10-02");
    expect(groups[0]?.items.map((item) => item.id)).toEqual([
      "earlier",
      "break",
      "later",
    ]);
  });

  it("shows active future appointments and blocks in the future filter", () => {
    const groups = buildCalendarFeed({
      appointments: [
        appointment({
          ends_at: "2026-10-02T09:00:00.000Z",
          id: "past",
          starts_at: "2026-10-02T08:00:00.000Z",
        }),
        appointment({
          ends_at: "2026-10-02T12:00:00.000Z",
          id: "upcoming",
          starts_at: "2026-10-02T11:00:00.000Z",
        }),
        appointment({
          ends_at: "2026-10-02T14:00:00.000Z",
          id: "cancelled",
          starts_at: "2026-10-02T13:00:00.000Z",
          status: "cancelled_by_customer",
        }),
      ],
      blocks: [
        block({
          ends_at: "2026-10-02T10:30:00.000Z",
          id: "future-break",
          starts_at: "2026-10-02T10:00:00.000Z",
        }),
      ],
      filter: "future",
      now: new Date("2026-10-02T10:00:00.000Z"),
      timezone: "UTC",
    });

    expect(groups.flatMap((group) => group.items.map((item) => item.id))).toEqual([
      "future-break",
      "upcoming",
    ]);
  });

  it("formats group dates in the selected locale", () => {
    expect(formatCalendarFeedDate("2026-10-02", "cz")).toBe(
      "pátek 2. října 2026",
    );
  });
});
