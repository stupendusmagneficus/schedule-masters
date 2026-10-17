import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { MasterAppointment } from "../appointments/manualBooking";
import {
  type AvailabilityDateOverride,
  buildAvailabilityOverrideDrafts,
  classifyAvailabilityDates,
  findAvailabilityConflicts,
  getEffectiveAvailability,
  isValidAvailabilityOverrideDraft,
  saveAvailabilityDateOverrides,
  summarizeAvailabilityDateSnapshots,
} from "./dateOverrides";

const weeklyRule = {
  dayOfWeek: 1,
  startLocalTime: "09:00",
  endLocalTime: "17:00",
};

describe("date-specific availability", () => {
  it("classifies selected dates by their effective weekly and override status", () => {
    expect(
      classifyAvailabilityDates(
        ["2030-01-08", "2030-01-07", "2030-01-08"],
        [weeklyRule],
        [
          {
            work_date: "2030-01-08",
            override_kind: "closed",
            start_local_time: null,
            end_local_time: null,
          },
        ],
      ),
    ).toEqual({ closedDates: ["2030-01-08"], openDates: ["2030-01-07"] });
  });

  it("summarizes captured dates independently of later calendar paging", () => {
    expect(
      summarizeAvailabilityDateSnapshots([
        { date: "2030-01-08", isClosed: true, appointments: [] },
        { date: "2030-01-07", isClosed: false, appointments: [] },
      ]),
    ).toEqual({ closedDates: ["2030-01-08"], openDates: ["2030-01-07"] });
  });

  it("builds one consistent batch of date overrides", () => {
    expect(
      buildAvailabilityOverrideDrafts(
        ["2030-01-08", "2030-01-09"],
        "modified",
        "10:00",
        "15:30",
      ),
    ).toEqual([
      {
        date: "2030-01-08",
        endLocalTime: "15:30",
        kind: "modified",
        startLocalTime: "10:00",
      },
      {
        date: "2030-01-09",
        endLocalTime: "15:30",
        kind: "modified",
        startLocalTime: "10:00",
      },
    ]);
    expect(
      buildAvailabilityOverrideDrafts(["2030-01-07"], "closed", null, null),
    ).toEqual([
      {
        date: "2030-01-07",
        endLocalTime: null,
        kind: "closed",
        startLocalTime: null,
      },
    ]);
  });

  it("sends a valid bulk update through one transactional RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await saveAvailabilityDateOverrides(client, "workspace-1", [
      {
        date: "2030-01-07",
        endLocalTime: "17:00",
        kind: "modified",
        startLocalTime: "09:00",
      },
      {
        date: "2030-01-08",
        endLocalTime: "17:00",
        kind: "modified",
        startLocalTime: "09:00",
      },
    ]);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("set_master_availability_date_overrides", {
      p_overrides: [
        {
          date: "2030-01-07",
          endLocalTime: "17:00",
          kind: "modified",
          startLocalTime: "09:00",
        },
        {
          date: "2030-01-08",
          endLocalTime: "17:00",
          kind: "modified",
          startLocalTime: "09:00",
        },
      ],
      p_workspace_id: "workspace-1",
    });
  });

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

  it("includes appointment buffers when reporting reduced hours", () => {
    const appointment = {
      customer_id: "client-1",
      customer_name: "Anna",
      ends_at: "2030-01-07T10:00:00.000Z",
      id: "booking-with-buffer",
      starts_at: "2030-01-07T09:15:00.000Z",
      status: "confirmed",
      occupied_starts_at: "2030-01-07T09:00:00.000Z",
      occupied_ends_at: "2030-01-07T10:15:00.000Z",
    } as MasterAppointment;

    expect(
      findAvailabilityConflicts([appointment], {
        date: "2030-01-07",
        endLocalTime: "17:00",
        kind: "modified",
        startLocalTime: "09:05",
        timezone: "UTC",
      }),
    ).toEqual([appointment]);
  });
});
