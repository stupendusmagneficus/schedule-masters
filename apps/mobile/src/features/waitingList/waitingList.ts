import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MasterWaitingListEntry =
  Database["public"]["Functions"]["list_master_waiting_list"]["Returns"][number];
export type MasterWaitingListMatch =
  Database["public"]["Functions"]["list_master_waiting_list_matches"]["Returns"][number];
export type WaitingListDraft = {
  readonly customerEmail?: string;
  readonly customerId?: string | null;
  readonly customerName: string;
  readonly customerPhone?: string;
  readonly desiredDate: string;
  readonly desiredTimeFrom?: string;
  readonly desiredTimeTo?: string;
  readonly note?: string;
  readonly serviceId: string;
};

type WaitingListClient = SupabaseClient<Database>;

export async function listMasterWaitingList(
  client: WaitingListClient,
  workspaceId: string,
): Promise<MasterWaitingListEntry[]> {
  const { data, error } = await client.rpc("list_master_waiting_list", {
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMasterWaitingListMatches(
  client: WaitingListClient,
  workspaceId: string,
  cancelledAppointmentId: string,
): Promise<MasterWaitingListMatch[]> {
  const { data, error } = await client.rpc("list_master_waiting_list_matches", {
    p_cancelled_appointment_id: cancelledAppointmentId,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveMasterWaitingListEntry(
  client: WaitingListClient,
  workspaceId: string,
  draft: WaitingListDraft,
  entryId?: string,
): Promise<string> {
  const args = {
    p_customer_email: draft.customerEmail?.trim() || undefined,
    p_customer_id: draft.customerId || undefined,
    p_customer_name: draft.customerName.trim(),
    p_customer_phone: draft.customerPhone?.trim() || undefined,
    p_desired_date: draft.desiredDate,
    p_desired_time_from: draft.desiredTimeFrom || undefined,
    p_desired_time_to: draft.desiredTimeTo || undefined,
    p_note: draft.note?.trim() || undefined,
    p_service_id: draft.serviceId,
    p_workspace_id: workspaceId,
  };
  const { data, error } = entryId
    ? await client.rpc("update_master_waiting_list_entry", {
        ...args,
        p_entry_id: entryId,
      })
    : await client.rpc("create_master_waiting_list_entry", args);
  if (error) throw new Error(error.message);
  return data;
}

export async function setMasterWaitingListEntryStatus(
  client: WaitingListClient,
  workspaceId: string,
  entryId: string,
  status: "booked" | "removed",
  appointmentId?: string,
): Promise<void> {
  const { error } = await client.rpc("set_master_waiting_list_entry_status", {
    p_appointment_id: appointmentId,
    p_entry_id: entryId,
    p_status: status,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
}
