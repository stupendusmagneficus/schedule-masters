import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceDataResource =
  | "appointments"
  | "bookingRequests"
  | "calendar"
  | "customerDirectory"
  | "customerHistory"
  | "freeSlots"
  | "finance"
  | "services";

const RESOURCE_DEPENDENCIES: Record<string, readonly WorkspaceDataResource[]> =
  {
    appointments: [
      "appointments",
      "bookingRequests",
      "calendar",
      "customerHistory",
      "finance",
      "freeSlots",
    ],
    availability_breaks: ["calendar", "freeSlots"],
    availability_date_overrides: ["calendar", "freeSlots"],
    availability_exceptions: ["calendar", "freeSlots"],
    availability_rules: ["calendar", "freeSlots"],
    customers: ["customerDirectory", "customerHistory"],
    services: ["freeSlots", "services"],
  };

const WORKSPACE_TABLES = [
  "appointments",
  "availability_breaks",
  "availability_date_overrides",
  "availability_exceptions",
  "availability_rules",
  "customers",
  "services",
] as const;
const ALL_WORKSPACE_RESOURCES: readonly WorkspaceDataResource[] = [
  "appointments",
  "bookingRequests",
  "calendar",
  "customerDirectory",
  "customerHistory",
  "finance",
  "freeSlots",
  "services",
];

export function getWorkspaceDataResources(
  table: string,
  payload?: { readonly new?: unknown; readonly old?: unknown },
): readonly WorkspaceDataResource[] {
  const resources = RESOURCE_DEPENDENCIES[table] ?? [];
  if (table !== "appointments" || !payload) return resources;

  const nextSource = (payload.new as { source?: unknown } | null)?.source;
  const previousSource = (payload.old as { source?: unknown } | null)?.source;
  return nextSource === "public_booking" || previousSource === "public_booking"
    ? resources
    : resources.filter((resource) => resource !== "bookingRequests");
}

export function subscribeToWorkspaceDataChanges(
  client: SupabaseClient<Database>,
  workspaceId: string,
  onChange: (resources: readonly WorkspaceDataResource[]) => void,
): () => void {
  let channel = client.channel(`workspace-data:${workspaceId}`);

  for (const table of WORKSPACE_TABLES) {
    const filter =
      table === "availability_breaks"
        ? undefined
        : `workspace_id=eq.${workspaceId}`;
    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        ...(filter ? { filter } : {}),
        schema: "public",
        table,
      },
      (payload) => onChange(getWorkspaceDataResources(table, payload)),
    );
  }

  let hasConnected = false;
  channel.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;
    if (hasConnected) onChange(ALL_WORKSPACE_RESOURCES);
    hasConnected = true;
  });
  return () => {
    void client.removeChannel(channel);
  };
}
