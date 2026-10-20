import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Workspace } from "../../types";
import {
  type BookingIntervalMinutes,
  defaultBookingIntervalMinutes,
  isBookingIntervalMinutes,
} from "./bookingInterval";

export type WorkspaceSettingsDraft = {
  readonly bookingIntervalMinutes: BookingIntervalMinutes;
  readonly publicBookingMinNoticeMinutes: number;
  readonly name: string;
  readonly slug: string;
};

export type WorkspaceSettingsError =
  | "bookingInterval"
  | "bookingNotice"
  | "name"
  | "slug";

type WorkspaceSettingsClient = SupabaseClient<Database>;

export function createWorkspaceSettingsDraft(
  workspace: Workspace,
): WorkspaceSettingsDraft {
  return {
    bookingIntervalMinutes:
      workspace.bookingIntervalMinutes ?? defaultBookingIntervalMinutes,
    publicBookingMinNoticeMinutes: workspace.publicBookingMinNoticeMinutes ?? 0,
    name: workspace.name,
    slug: workspace.slug,
  };
}

export function validateWorkspaceSettings(
  draft: WorkspaceSettingsDraft,
): WorkspaceSettingsError | null {
  const name = draft.name.trim();
  if (!name || name.length > 120) return "name";
  if (!isBookingIntervalMinutes(draft.bookingIntervalMinutes)) {
    return "bookingInterval";
  }
  if (
    !Number.isInteger(draft.publicBookingMinNoticeMinutes) ||
    draft.publicBookingMinNoticeMinutes < 0 ||
    draft.publicBookingMinNoticeMinutes > 10080 ||
    draft.publicBookingMinNoticeMinutes % 15 !== 0
  ) {
    return "bookingNotice";
  }

  const slug = draft.slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "slug";

  return null;
}

export async function saveWorkspaceSettings(
  client: WorkspaceSettingsClient,
  workspaceId: string,
  draft: WorkspaceSettingsDraft,
): Promise<void> {
  const { error } = await client.rpc("update_master_workspace_preferences", {
    p_booking_interval_minutes: draft.bookingIntervalMinutes,
    p_name: draft.name.trim(),
    p_notice_minutes: draft.publicBookingMinNoticeMinutes,
    p_slug: draft.slug.trim(),
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
}
