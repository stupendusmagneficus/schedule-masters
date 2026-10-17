import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  saveWorkspaceSettings,
  type WorkspaceSettingsDraft,
} from "./workspaceSettings";

const draft: WorkspaceSettingsDraft = {
  bookingIntervalMinutes: 15,
  endTime: "18:00",
  name: "Anna Nails",
  slug: "anna-nails",
  startTime: "09:00",
  workingDays: [1, 2, 3, 4, 5],
};

describe("saveWorkspaceSettings", () => {
  it("sends the complete workspace and schedule as one atomic RPC request", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await saveWorkspaceSettings(client, "workspace-1", draft);

    expect(rpc).toHaveBeenCalledWith("update_master_workspace_settings", {
      p_end_local_time: "18:00",
      p_booking_interval_minutes: 15,
      p_name: "Anna Nails",
      p_slug: "anna-nails",
      p_start_local_time: "09:00",
      p_working_days: [1, 2, 3, 4, 5],
      p_workspace_id: "workspace-1",
    });
  });

  it("preserves the server error so the screen can show an inline failure", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: { message: "Booking slug is already taken" },
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      saveWorkspaceSettings(client, "workspace-1", draft),
    ).rejects.toThrow("Booking slug is already taken");
  });
});
