import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  buildCustomerPhoneUrl,
  getMasterCustomerPhone,
} from "./customerContact";

describe("customer contact", () => {
  it("loads only the selected customer's phone from the active workspace", async () => {
    const query = {
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { phone: "+420 123 456 789" },
        error: null,
      }),
      select: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    const from = vi.fn().mockReturnValue(query);
    const client = { from } as unknown as SupabaseClient<Database>;

    await expect(
      getMasterCustomerPhone(client, "workspace-a", "customer-a"),
    ).resolves.toBe("+420 123 456 789");
    expect(from).toHaveBeenCalledWith("customers");
    expect(query.select).toHaveBeenCalledWith("phone");
    expect(query.eq).toHaveBeenCalledWith("workspace_id", "workspace-a");
    expect(query.eq).toHaveBeenCalledWith("id", "customer-a");
    expect(query.is).toHaveBeenCalledWith("anonymized_at", null);
  });

  it("preserves null when the customer has no phone and propagates access errors", async () => {
    const noPhoneQuery = {
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { phone: null }, error: null }),
      select: vi.fn(),
    };
    noPhoneQuery.select.mockReturnValue(noPhoneQuery);
    noPhoneQuery.eq.mockReturnValue(noPhoneQuery);
    noPhoneQuery.is.mockReturnValue(noPhoneQuery);
    const deniedQuery = {
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Workspace access denied" },
      }),
      select: vi.fn(),
    };
    deniedQuery.select.mockReturnValue(deniedQuery);
    deniedQuery.eq.mockReturnValue(deniedQuery);
    deniedQuery.is.mockReturnValue(deniedQuery);
    const noPhoneClient = {
      from: vi.fn().mockReturnValue(noPhoneQuery),
    } as unknown as SupabaseClient<Database>;
    const deniedClient = {
      from: vi.fn().mockReturnValue(deniedQuery),
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
