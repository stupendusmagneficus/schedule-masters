import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  saveWorkspaceSettings,
  type WorkspaceSettingsDraft,
} from "./workspaceSettings";

const draft: WorkspaceSettingsDraft = {
  bookingIntervalMinutes: 15,
  publicBookingMinNoticeMinutes: 120,
  name: "Anna Nails",
  slug: "anna-nails",
};

describe("saveWorkspaceSettings", () => {
  it("saves profile and booking preferences without sending any schedule fields", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await saveWorkspaceSettings(client, "workspace-1", draft);

    expect(rpc).toHaveBeenCalledWith("update_master_workspace_preferences", {
      p_booking_interval_minutes: 15,
      p_name: "Anna Nails",
      p_notice_minutes: 120,
      p_slug: "anna-nails",
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
