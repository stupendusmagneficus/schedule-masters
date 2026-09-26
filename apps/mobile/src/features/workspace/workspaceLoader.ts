import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Service, Workspace } from "../../types";

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
    .select("id, name, slug, timezone")
    .eq("id", member.workspace_id)
    .single();

  if (workspaceResult.error || !workspaceResult.data) {
    return { kind: "error" };
  }

  const serviceResult = await client
    .from("services")
    .select(
      "id, name, description, duration_minutes, buffer_before_minutes, buffer_after_minutes, price_amount, currency, is_active, sort_order, archived_at",
    )
    .eq("workspace_id", member.workspace_id)
    .eq("is_active", true)
    .is("archived_at", null)
    .order("sort_order")
    .order("name");

  if (serviceResult.error) return { kind: "error" };

  return {
    kind: "ready",
    memberRole: member.role,
    services: serviceResult.data ?? [],
    workspace: workspaceResult.data,
  };
}
