import { describe, expect, it } from "vitest";

import {
  createIdempotencyKey,
  deduplicateManualBookingCustomers,
  type ManualBookingDraft,
  validateManualBookingDraft,
} from "./manualBooking";

const validDraft: ManualBookingDraft = {
  customerId: null,
  date: "2030-01-03",
  durationMinutes: "90",
  email: "",
  masterNote: "",
  name: "Anna",
  phone: "",
  priceAmount: "700",
  serviceId: "service-id",
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

  it("removes customers with the same normalized contact details", () => {
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
      {
        ...customer,
        id: "second-customer-id",
        name: "Marta",
        phone: "420987654321",
      },
    ]);
  });
});
