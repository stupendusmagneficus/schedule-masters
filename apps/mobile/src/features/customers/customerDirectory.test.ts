import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  anonymizeCustomer,
  listCustomerDirectory,
  listCustomerHistory,
} from "./customerDirectory";

describe("customer directory data access", () => {
  it("searches only within the requested workspace", async () => {
    const rows = [
      {
        id: "customer-a",
        name: "Anna",
        email: "same@example.com",
        phone: null,
        notes: null,
        completed_visits: 0,
        last_completed_visit_at: null,
      },
      {
        id: "customer-b",
        name: "Marta",
        email: "same@example.com",
        phone: null,
        notes: null,
        completed_visits: 0,
        last_completed_visit_at: null,
      },
    ];
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      listCustomerDirectory(client, "workspace-a", "  same@example.com  "),
    ).resolves.toEqual(rows);
    expect(rpc).toHaveBeenCalledWith("list_master_customer_directory", {
      p_search: "same@example.com",
      p_workspace_id: "workspace-a",
    });
  });

  it.each(["Anna", "+420 123 456 789", "anna@example.com"])(
    "passes name, phone, and email searches to the server filter (%s)",
    async (search) => {
      const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
      const client = { rpc } as unknown as SupabaseClient<Database>;

      await listCustomerDirectory(client, "workspace-a", search);

      expect(rpc).toHaveBeenCalledWith("list_master_customer_directory", {
        p_search: search,
        p_workspace_id: "workspace-a",
      });
    },
  );

  it("requests real history for the selected customer in the workspace", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await listCustomerHistory(client, "workspace-a", "customer-a");

    expect(rpc).toHaveBeenCalledWith("list_master_customer_history", {
      p_customer_id: "customer-a",
      p_workspace_id: "workspace-a",
    });
  });

  it("does not turn server failures into an empty directory", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Workspace access denied" },
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      listCustomerDirectory(client, "workspace-a", ""),
    ).rejects.toThrow("Workspace access denied");
  });

  it("requests customer anonymization inside the active workspace", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      anonymizeCustomer(client, "workspace-a", "customer-a"),
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("anonymize_master_customer", {
      p_customer_id: "customer-a",
      p_workspace_id: "workspace-a",
    });
  });

  it("does not hide failed anonymization requests", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Permission denied" },
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      anonymizeCustomer(client, "workspace-a", "customer-a"),
    ).rejects.toThrow("Permission denied");
  });
});
