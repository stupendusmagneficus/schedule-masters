import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  listMasterPendingBookingRequests,
  subscribeToMasterPendingBookingRequestChanges,
} from "./bookingRequests";

describe("master pending booking requests", () => {
  it("subscribes to appointment changes scoped to one workspace", () => {
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    const removeChannel = vi.fn();
    const client = {
      channel: vi.fn().mockReturnValue(channel),
      removeChannel,
    } as unknown as SupabaseClient<Database>;
    const onChange = vi.fn();

    const unsubscribe = subscribeToMasterPendingBookingRequestChanges(
      client,
      "workspace-a",
      onChange,
    );

    expect(client.channel).toHaveBeenCalledWith(
      "master-pending-booking-requests:workspace-a",
    );
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "*",
        filter: "workspace_id=eq.workspace-a",
        schema: "public",
        table: "appointments",
      },
      expect.any(Function),
    );
    unsubscribe();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  it("refreshes only for public booking appointment changes", () => {
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    const client = {
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn(),
    } as unknown as SupabaseClient<Database>;
    const onChange = vi.fn();

    subscribeToMasterPendingBookingRequestChanges(
      client,
      "workspace-a",
      onChange,
    );
    const callback = channel.on.mock.calls[0]?.[2] as (payload: {
      new: unknown;
      old: unknown;
    }) => void;

    callback({ new: { source: "master_created" }, old: {} });
    expect(onChange).not.toHaveBeenCalled();
    callback({ new: { source: "public_booking" }, old: {} });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("loads requests for the selected workspace", async () => {
    const rows = [
      {
        id: "appointment-1",
        customer_name: "Anna",
        customer_email: "anna@example.com",
        customer_phone: null,
        service_name: "Manicure",
        duration_minutes: 60,
        starts_at: "2030-01-10T09:00:00.000Z",
        ends_at: "2030-01-10T10:00:00.000Z",
        status: "pending" as const,
        created_at: "2030-01-01T10:00:00.000Z",
      },
    ];
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      listMasterPendingBookingRequests(client, "workspace-a"),
    ).resolves.toEqual(rows);
    expect(rpc).toHaveBeenCalledWith("list_master_pending_booking_requests", {
      p_workspace_id: "workspace-a",
    });
  });

  it("does not represent a failed request as an empty queue", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Workspace access denied" },
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      listMasterPendingBookingRequests(client, "workspace-a"),
    ).rejects.toThrow("Workspace access denied");
  });
});
