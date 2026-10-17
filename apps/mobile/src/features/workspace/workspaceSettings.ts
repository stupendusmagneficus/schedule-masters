import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Workspace } from "../../types";
import {
  type BookingIntervalMinutes,
  defaultBookingIntervalMinutes,
  isBookingIntervalMinutes,
} from "./bookingInterval";

export type WorkspaceSettingsDraft = {
  readonly endTime: string;
  readonly bookingIntervalMinutes: BookingIntervalMinutes;
  readonly name: string;
  readonly slug: string;
  readonly startTime: string;
  readonly workingDays: ReadonlyArray<number>;
};

export type WorkspaceSettingsError =
  | "bookingInterval"
  | "name"
  | "schedule"
  | "slug"
  | "workingDays";

type WorkspaceSettingsClient = SupabaseClient<Database>;

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function createWorkspaceSettingsDraft(
  workspace: Workspace,
): WorkspaceSettingsDraft {
  const firstRule = workspace.availabilityRules[0];
  const workingDays = [
    ...new Set(workspace.availabilityRules.map((rule) => rule.dayOfWeek)),
  ];
  return {
    endTime: firstRule?.endLocalTime.slice(0, 5) ?? "17:00",
    bookingIntervalMinutes:
      workspace.bookingIntervalMinutes ?? defaultBookingIntervalMinutes,
    name: workspace.name,
    slug: workspace.slug,
    startTime: firstRule?.startLocalTime.slice(0, 5) ?? "09:00",
    workingDays,
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

  const slug = draft.slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "slug";

  if (
    !draft.workingDays.length ||
    draft.workingDays.some(
      (day) => !Number.isInteger(day) || day < 1 || day > 7,
    ) ||
    new Set(draft.workingDays).size !== draft.workingDays.length
  ) {
    return "workingDays";
  }

  if (
    !timePattern.test(draft.startTime) ||
    !timePattern.test(draft.endTime) ||
    timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime)
  ) {
    return "schedule";
  }
  return null;
}

export async function saveWorkspaceSettings(
  client: WorkspaceSettingsClient,
  workspaceId: string,
  draft: WorkspaceSettingsDraft,
): Promise<void> {
  const { error } = await client.rpc("update_master_workspace_settings", {
    p_end_local_time: draft.endTime,
    p_booking_interval_minutes: draft.bookingIntervalMinutes,
    p_name: draft.name.trim(),
    p_slug: draft.slug.trim(),
    p_start_local_time: draft.startTime,
    p_working_days: [...draft.workingDays],
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
