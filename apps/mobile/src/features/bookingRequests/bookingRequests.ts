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
