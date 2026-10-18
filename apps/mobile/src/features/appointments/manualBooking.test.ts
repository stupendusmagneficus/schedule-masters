import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  createIdempotencyKey,
  createMasterBooking,
  deduplicateManualBookingCustomers,
  listMasterAvailableSlots,
  listMasterFutureSeriesAppointments,
  listMasterMonthAvailableSlots,
  type ManualBookingDraft,
  validateManualBookingDraft,
} from "./manualBooking";
import { moveManualBookingService } from "./manualBookingServices";

const validDraft: ManualBookingDraft = {
  customerId: null,
  date: "2030-01-03",
  email: "",
  masterNote: "",
  name: "Anna",
  phone: "",
  serviceIds: ["service-id"],
  startsAt: "2030-01-03T08:30:00.000Z",
};

describe("manual booking validation", () => {
  it("accepts a new customer without email or phone", () => {
    expect(validateManualBookingDraft(validDraft)).toBeNull();
  });

  it("accepts an existing customer without a repeated name", () => {
    expect(
      validateManualBookingDraft({
        ...validDraft,
        customerId: "customer-id",
        name: "",
      }),
    ).toBeNull();
  });

  it("requires a customer name for a new customer", () => {
    expect(validateManualBookingDraft({ ...validDraft, name: "" })).toBe(
      "name",
    );
  });

  it("validates optional email only when it is provided", () => {
    expect(
      validateManualBookingDraft({ ...validDraft, email: "invalid-email" }),
    ).toBe("email");
  });

  it("requires a selected available slot", () => {
    expect(validateManualBookingDraft({ ...validDraft, startsAt: "" })).toBe(
      "slot",
    );
  });

  it("requires at least one selected service", () => {
    expect(validateManualBookingDraft({ ...validDraft, serviceIds: [] })).toBe(
      "services",
    );
  });

  it("keeps the service selection within the booking API limit", () => {
    expect(
      validateManualBookingDraft({
        ...validDraft,
        serviceIds: Array.from(
          { length: 21 },
          (_, index) => `service-${index}`,
        ),
      }),
    ).toBe("serviceLimit");
  });

  it("generates a non-empty idempotency key", () => {
    expect(createIdempotencyKey()).toEqual(expect.any(String));
  });

  it("removes duplicate customers by id while preserving order", () => {
    const customer = {
      id: "customer-id",
      name: "Anna",
      email: "",
      phone: "",
    };

    expect(
      deduplicateManualBookingCustomers([
        customer,
        customer,
        { ...customer, id: "second-customer-id", name: "Marta" },
      ]),
    ).toEqual([
      customer,
      { ...customer, id: "second-customer-id", name: "Marta" },
    ]);
  });

  it("keeps separate profiles even when contact details match", () => {
    const customer = {
      id: "customer-id",
      name: "Yahor Dunayeu",
      email: "",
      phone: "+420 123 456 789",
    };

    expect(
      deduplicateManualBookingCustomers([
        customer,
        {
          ...customer,
          id: "duplicate-customer-id",
          phone: "420123456789",
        },
        {
          ...customer,
          id: "second-customer-id",
          name: "Marta",
          phone: "420987654321",
        },
      ]),
    ).toEqual([
      customer,
      { ...customer, id: "duplicate-customer-id", phone: "420123456789" },
      {
        ...customer,
        id: "second-customer-id",
        name: "Marta",
        phone: "420987654321",
      },
    ]);
  });
});

describe("manual booking service order", () => {
  it("moves a selected service without losing the remaining order", () => {
    expect(moveManualBookingService(["a", "b", "c"], "c", -1)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("keeps the order unchanged at its boundary or for an unknown service", () => {
    expect(moveManualBookingService(["a", "b"], "a", -1)).toEqual(["a", "b"]);
    expect(moveManualBookingService(["a", "b"], "x", 1)).toEqual(["a", "b"]);
  });
});

describe("monthly manual booking availability", () => {
  it("loads all month slots through the shared master availability RPC", async () => {
    const rows = [
      {
        available_date: "2030-01-03",
        ends_at: "2030-01-03T10:00:00.000Z",
        starts_at: "2030-01-03T09:00:00.000Z",
      },
    ];
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      listMasterMonthAvailableSlots(
        client,
        "workspace-id",
        "service-id",
        "2030-01-18",
      ),
    ).resolves.toEqual(rows);
    expect(rpc).toHaveBeenCalledWith("get_master_month_available_slots", {
      p_month_start: "2030-01-01",
      p_service_id: "service-id",
      p_workspace_id: "workspace-id",
    });
  });
});

describe("multi-service manual booking API", () => {
  it("loads availability for the ordered service selection", async () => {
    const rows = [
      {
        ends_at: "2030-01-03T11:00:00.000Z",
        starts_at: "2030-01-03T09:00:00.000Z",
      },
    ];
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      listMasterAvailableSlots(
        client,
        "workspace-id",
        ["service-a", "service-b"],
        "2030-01-03",
      ),
    ).resolves.toEqual(rows);
    expect(rpc).toHaveBeenCalledWith(
      "get_master_available_slots_for_services",
      {
        p_date: "2030-01-03",
        p_service_ids: ["service-a", "service-b"],
        p_workspace_id: "workspace-id",
      },
    );
  });

  it("loads only the future appointments affected by series cancellation", async () => {
    const rows = [
      {
        ends_at: "2030-01-10T10:00:00.000Z",
        id: "appointment-id",
        service_name: "Manicure",
        starts_at: "2030-01-10T09:00:00.000Z",
        status: "confirmed",
      },
    ];
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      listMasterFutureSeriesAppointments(
        client,
        "workspace-id",
        "appointment-id",
      ),
    ).resolves.toEqual(rows);
    expect(rpc).toHaveBeenCalledWith("list_master_appointment_series_future", {
      p_appointment_id: "appointment-id",
      p_workspace_id: "workspace-id",
    });
  });

  it("creates one appointment with the ordered service selection", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { id: "appointment-id" }, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    await expect(
      createMasterBooking(
        client,
        "workspace-id",
        validDraft,
        "idempotency-key",
      ),
    ).resolves.toEqual({ id: "appointment-id" });
    expect(rpc).toHaveBeenCalledWith("create_master_booking_with_services", {
      p_customer_id: undefined,
      p_email: undefined,
      p_idempotency_key: "idempotency-key",
      p_master_note: undefined,
      p_name: "Anna",
      p_phone: undefined,
      p_service_ids: ["service-id"],
      p_starts_at: validDraft.startsAt,
      p_workspace_id: "workspace-id",
    });
  });

  it("keeps the selected service order when creating a combined appointment", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { id: "appointment-id" }, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const draft = { ...validDraft, serviceIds: ["pedicure-id", "manicure-id"] };

    await createMasterBooking(client, "workspace-id", draft, "idempotency-key");

    expect(rpc).toHaveBeenCalledWith(
      "create_master_booking_with_services",
      expect.objectContaining({
        p_service_ids: ["pedicure-id", "manicure-id"],
      }),
    );
  });
});
