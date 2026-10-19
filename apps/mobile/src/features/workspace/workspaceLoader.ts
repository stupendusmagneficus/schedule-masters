import { type Database, parseServiceTranslations } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Service, Workspace } from "../../types";
import { defaultBookingIntervalMinutes } from "./bookingInterval";

export type WorkspaceLoadResult =
  | { readonly kind: "error" }
  | { readonly kind: "setupRequired" }
  | {
      readonly kind: "ready";
      readonly memberRole: "admin" | "member" | "owner";
      readonly services: readonly Service[];
      readonly workspace: Workspace;
    };

export async function loadMasterWorkspace(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<WorkspaceLoadResult> {
  const { data: member, error: memberError } = await client
    .from("workspace_members")
    .select("role, workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) return { kind: "error" };
  if (!member) return { kind: "setupRequired" };

  const workspaceResult = await client
    .from("workspaces")
    .select(
      "id, name, slug, timezone, booking_interval_minutes, public_booking_min_notice_minutes",
    )
    .eq("id", member.workspace_id)
    .single();

  if (workspaceResult.error || !workspaceResult.data) {
    return { kind: "error" };
  }

  const serviceResult = await client
    .from("services")
    .select(
      "id, name, category, description, duration_minutes, buffer_before_minutes, buffer_after_minutes, price_amount, currency, is_active, sort_order, archived_at, source_locale, translations",
    )
    .eq("workspace_id", member.workspace_id)
    .eq("is_active", true)
    .is("archived_at", null)
    .order("sort_order")
    .order("name");

  if (serviceResult.error) return { kind: "error" };

  const availabilityResult = await client
    .from("availability_rules")
    .select("day_of_week, start_local_time, end_local_time")
    .eq("workspace_id", member.workspace_id)
    .eq("is_active", true)
    .order("day_of_week");

  if (availabilityResult.error) return { kind: "error" };

  return {
    kind: "ready",
    memberRole: member.role,
    services: (serviceResult.data ?? []).map((service) => ({
      ...service,
      translations: parseServiceTranslations(service.translations),
    })),
    workspace: {
      ...workspaceResult.data,
      bookingIntervalMinutes:
        workspaceResult.data.booking_interval_minutes ??
        defaultBookingIntervalMinutes,
      publicBookingMinNoticeMinutes:
        workspaceResult.data.public_booking_min_notice_minutes ?? 0,
      availabilityRules: (availabilityResult.data ?? []).map((rule) => ({
        dayOfWeek: rule.day_of_week,
        endLocalTime: rule.end_local_time,
        startLocalTime: rule.start_local_time,
      })),
    },
  };
}
