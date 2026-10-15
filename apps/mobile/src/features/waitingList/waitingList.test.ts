import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  createMasterWaitingListCustomer,
  listMasterWaitingList,
  listMasterWaitingListMatches,
  moveBookingRequestToWaitingList,
  removeAllMasterWaitingListEntries,
  saveMasterWaitingListEntry,
  setMasterWaitingListEntryStatus,
} from "./waitingList";

describe("master waiting list API", () => {
  it("loads entries scoped to the current workspace", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    await expect(listMasterWaitingList(client, "workspace-a")).resolves.toEqual(
      [],
    );
    expect(rpc).toHaveBeenCalledWith("list_master_waiting_list", {
      p_workspace_id: "workspace-a",
    });
  });

  it("passes only an exact released appointment as the matching context", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    await listMasterWaitingListMatches(client, "workspace-a", "appointment-1");
    expect(rpc).toHaveBeenCalledWith("list_master_waiting_list_matches", {
      p_cancelled_appointment_id: "appointment-1",
      p_workspace_id: "workspace-a",
    });
  });

  it("creates or edits one entry and preserves optional preferences", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "entry-1", error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const draft = {
      customerId: "customer-1",
      customerName: "Anna",
      desiredDate: "2030-01-03",
      desiredTimeFrom: "09:00",
      desiredTimeTo: "11:00",
      serviceId: "service-1",
    };
    await saveMasterWaitingListEntry(client, "workspace-a", draft);
    expect(rpc).toHaveBeenCalledWith("create_master_waiting_list_entry", {
      p_customer_id: "customer-1",
      p_customer_name: "Anna",
      p_desired_date: "2030-01-03",
      p_desired_time_from: "09:00",
      p_desired_time_to: "11:00",
      p_service_id: "service-1",
      p_workspace_id: "workspace-a",
    });
    await saveMasterWaitingListEntry(client, "workspace-a", draft, "entry-1");
    expect(rpc).toHaveBeenLastCalledWith("update_master_waiting_list_entry", {
      p_customer_id: "customer-1",
      p_customer_name: "Anna",
      p_desired_date: "2030-01-03",
      p_desired_time_from: "09:00",
      p_desired_time_to: "11:00",
      p_entry_id: "entry-1",
      p_service_id: "service-1",
      p_workspace_id: "workspace-a",
    });
  });

  it("records a booked transition against the created appointment", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: undefined, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    await setMasterWaitingListEntryStatus(
      client,
      "workspace-a",
      "entry-1",
      "booked",
      "appointment-1",
    );
    expect(rpc).toHaveBeenCalledWith("set_master_waiting_list_entry_status", {
      p_appointment_id: "appointment-1",
      p_entry_id: "entry-1",
      p_status: "booked",
      p_workspace_id: "workspace-a",
    });
  });

  it("removes all active entries through one workspace-scoped operation", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    await expect(
      removeAllMasterWaitingListEntries(client, "workspace-a"),
    ).resolves.toBe(3);
    expect(rpc).toHaveBeenCalledWith("remove_all_master_waiting_list_entries", {
      p_workspace_id: "workspace-a",
    });
  });

  it("creates a new customer and waiting-list entry atomically", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "entry-2", error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    await expect(
      createMasterWaitingListCustomer(client, "workspace-a", {
        customerEmail: "new@example.test",
        customerName: "New client",
        customerPhone: "+420 123 456 789",
        desiredDate: "2030-01-03",
        serviceId: "service-1",
      }),
    ).resolves.toBe("entry-2");
    expect(rpc).toHaveBeenCalledWith("create_master_waiting_list_customer", {
      p_customer_email: "new@example.test",
      p_customer_name: "New client",
      p_customer_phone: "+420 123 456 789",
      p_desired_date: "2030-01-03",
      p_service_id: "service-1",
      p_workspace_id: "workspace-a",
    });
  });

  it("moves a public request using the workspace-scoped RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "entry-1", error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    await expect(
      moveBookingRequestToWaitingList(client, "workspace-a", "appointment-1"),
    ).resolves.toBe("entry-1");
    expect(rpc).toHaveBeenCalledWith("move_booking_request_to_waiting_list", {
      p_appointment_id: "appointment-1",
      p_workspace_id: "workspace-a",
    });
  });
});
