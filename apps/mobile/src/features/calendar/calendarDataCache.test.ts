import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  getCachedCalendarData,
  loadCachedCalendarData,
} from "./calendarDataCache";

function createClient() {
  const rpc = vi.fn(
    async (functionName: string, args: Record<string, string>) => {
      void functionName;
      void args;
      return { data: [], error: null };
    },
  );
  return {
    client: { rpc } as unknown as SupabaseClient<Database>,
    rpc,
  };
}

describe("calendar data cache", () => {
  it("reuses data across overlapping ranges and client objects remain isolated", async () => {
    const first = createClient();
    const range = { fromDate: "2026-10-14", toDate: "2026-10-14" };

    await loadCachedCalendarData(
      first.client,
      "workspace-a",
      "Europe/Prague",
      range,
    );
    expect(
      getCachedCalendarData(
        first.client,
        "workspace-a",
        "Europe/Prague",
        range,
      ),
    ).toEqual({ appointments: [], blocks: [] });
    expect(first.rpc).toHaveBeenCalledTimes(2);

    const second = createClient();
    expect(
      getCachedCalendarData(
        second.client,
        "workspace-a",
        "Europe/Prague",
        range,
      ),
    ).toBeUndefined();
    await loadCachedCalendarData(
      second.client,
      "workspace-a",
      "Europe/Prague",
      range,
    );
    expect(second.rpc).toHaveBeenCalledTimes(2);
  });

  it("keeps workspace and timezone cache entries separate", async () => {
    const { client, rpc } = createClient();
    const range = { fromDate: "2026-10-14", toDate: "2026-10-14" };
    await loadCachedCalendarData(client, "workspace-a", "Europe/Prague", range);
    await loadCachedCalendarData(client, "workspace-b", "Europe/Prague", range);
    await loadCachedCalendarData(client, "workspace-a", "UTC", range);

    expect(rpc).toHaveBeenCalledTimes(6);
  });

  it("loads only uncovered dates when switching from day to week", async () => {
    const { client, rpc } = createClient();
    await loadCachedCalendarData(client, "workspace-a", "UTC", {
      fromDate: "2026-10-14",
      toDate: "2026-10-14",
    });
    await loadCachedCalendarData(client, "workspace-a", "UTC", {
      fromDate: "2026-10-12",
      toDate: "2026-10-18",
    });

    expect(rpc).toHaveBeenCalledTimes(6);
    expect(
      rpc.mock.calls
        .map(([, args]) => args)
        .sort((left, right) =>
          `${left.p_from_date}:${left.p_to_date}`.localeCompare(
            `${right.p_from_date}:${right.p_to_date}`,
          ),
        ),
    ).toEqual(
      [
        {
          p_from_date: "2026-10-14",
          p_to_date: "2026-10-14",
          p_workspace_id: "workspace-a",
        },
        {
          p_from_date: "2026-10-14",
          p_to_date: "2026-10-14",
          p_workspace_id: "workspace-a",
        },
        {
          p_from_date: "2026-10-12",
          p_to_date: "2026-10-13",
          p_workspace_id: "workspace-a",
        },
        {
          p_from_date: "2026-10-15",
          p_to_date: "2026-10-18",
          p_workspace_id: "workspace-a",
        },
        {
          p_from_date: "2026-10-12",
          p_to_date: "2026-10-13",
          p_workspace_id: "workspace-a",
        },
        {
          p_from_date: "2026-10-15",
          p_to_date: "2026-10-18",
          p_workspace_id: "workspace-a",
        },
      ].sort((left, right) =>
        `${left.p_from_date}:${left.p_to_date}`.localeCompare(
          `${right.p_from_date}:${right.p_to_date}`,
        ),
      ),
    );
  });
});
