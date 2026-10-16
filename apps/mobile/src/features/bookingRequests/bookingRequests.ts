import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MasterPendingBookingRequest =
  Database["public"]["Functions"]["list_master_pending_booking_requests"]["Returns"][number];

type BookingRequestsClient = SupabaseClient<Database>;

export async function listMasterPendingBookingRequests(
  client: BookingRequestsClient,
  workspaceId: string,
): Promise<MasterPendingBookingRequest[]> {
  const { data, error } = await client.rpc(
    "list_master_pending_booking_requests",
    { p_workspace_id: workspaceId },
  );
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function subscribeToMasterPendingBookingRequestChanges(
  client: BookingRequestsClient,
  workspaceId: string,
  onChange: () => void,
): () => void {
  const channel = client
    .channel(`master-pending-booking-requests:${workspaceId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        filter: `workspace_id=eq.${workspaceId}`,
        schema: "public",
        table: "appointments",
      },
      (payload) => {
        const nextSource = (payload.new as { source?: unknown } | null)?.source;
        const previousSource = (payload.old as { source?: unknown } | null)
          ?.source;
        if (
          nextSource === "public_booking" ||
          previousSource === "public_booking"
        ) {
          onChange();
        }
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
