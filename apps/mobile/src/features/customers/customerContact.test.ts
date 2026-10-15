import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  buildCustomerPhoneUrl,
  getMasterCustomerPhone,
} from "./customerContact";

describe("customer contact", () => {
  it("loads only the selected customer's phone from the active workspace", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ phone: "+420 123 456 789" }],
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      getMasterCustomerPhone(client, "workspace-a", "customer-a"),
    ).resolves.toBe("+420 123 456 789");
    expect(rpc).toHaveBeenCalledWith("get_master_customer_contact", {
      p_customer_id: "customer-a",
      p_workspace_id: "workspace-a",
    });
  });

  it("preserves null when the customer has no phone and propagates access errors", async () => {
    const noPhoneClient = {
      rpc: vi.fn().mockResolvedValue({ data: [{ phone: null }], error: null }),
    } as unknown as SupabaseClient<Database>;
    const deniedClient = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Workspace access denied" },
      }),
    } as unknown as SupabaseClient<Database>;

    await expect(
      getMasterCustomerPhone(noPhoneClient, "workspace-a", "customer-a"),
    ).resolves.toBeNull();
    await expect(
      getMasterCustomerPhone(deniedClient, "workspace-a", "customer-a"),
    ).rejects.toThrow("Workspace access denied");
  });

  it("builds native call and SMS links without spaces or punctuation", () => {
    expect(buildCustomerPhoneUrl("+420 (123) 456-789", "call")).toBe(
      "tel:+420123456789",
    );
    expect(buildCustomerPhoneUrl("+420 (123) 456-789", "sms")).toBe(
      "sms:+420123456789",
    );
    expect(buildCustomerPhoneUrl("—", "call")).toBeNull();
  });
});
