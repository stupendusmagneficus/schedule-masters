import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Service, Workspace } from "../../types";

export type WorkspaceLoadResult =
  | { readonly kind: "error" }
  | { readonly kind: "setupRequired" }
  | {
      readonly kind: "ready";
      readonly service: Service | null;
      readonly workspace: Workspace;
    };

export async function loadMasterWorkspace(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<WorkspaceLoadResult> {
  const { data: member, error: memberError } = await client
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) return { kind: "error" };
  if (!member) return { kind: "setupRequired" };

  const [workspaceResult, serviceResult] = await Promise.all([
    client
      .from("workspaces")
      .select("id, name, slug, timezone")
      .eq("id", member.workspace_id)
      .single(),
    client
      .from("services")
      .select("id, name, duration_minutes, price_amount, currency")
      .eq("workspace_id", member.workspace_id)
      .eq("is_active", true)
      .order("sort_order")
      .limit(1)
      .maybeSingle(),
  ]);

  if (workspaceResult.error || serviceResult.error || !workspaceResult.data) {
    return { kind: "error" };
  }

  return {
    kind: "ready",
    service: serviceResult.data,
    workspace: workspaceResult.data,
  };
}
