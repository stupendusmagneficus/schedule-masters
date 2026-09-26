import { describe, expect, it } from "vitest";
import type { Service } from "../../types";
import {
  createServiceDraft,
  type ServiceDraft,
  validateServiceDraft,
} from "./serviceCatalog";

const validDraft: ServiceDraft = {
  bufferAfterMinutes: "10",
  bufferBeforeMinutes: "5",
  currency: "CZK",
  description: "Gel manicure with a clean finish.",
  durationMinutes: "90",
  name: "Gel manicure",
  priceAmount: "700",
  sortOrder: "0",
};

describe("service catalog validation", () => {
  it("accepts a complete service draft", () => {
    expect(validateServiceDraft(validDraft)).toBeNull();
  });

  it("requires a non-empty bounded name", () => {
    expect(validateServiceDraft({ ...validDraft, name: " " })).toBe("name");
    expect(validateServiceDraft({ ...validDraft, name: "x".repeat(121) })).toBe(
      "name",
    );
  });

  it("validates duration, buffers, and price", () => {
    expect(validateServiceDraft({ ...validDraft, durationMinutes: "0" })).toBe(
      "durationMinutes",
    );
    expect(
      validateServiceDraft({ ...validDraft, bufferAfterMinutes: "241" }),
    ).toBe("bufferAfterMinutes");
    expect(validateServiceDraft({ ...validDraft, priceAmount: "-1" })).toBe(
      "priceAmount",
    );
  });

  it("requires an uppercase three-letter currency code", () => {
    expect(validateServiceDraft({ ...validDraft, currency: "cz" })).toBe(
      "currency",
    );
    expect(validateServiceDraft({ ...validDraft, currency: "CZK" })).toBeNull();
  });

  it("maps an existing service to an editable draft", () => {
    const service: Service = {
      archived_at: null,
      buffer_after_minutes: 10,
      buffer_before_minutes: 5,
      currency: "CZK",
      description: "Gel manicure with a clean finish.",
      duration_minutes: 90,
      id: "service-id",
      is_active: true,
      name: "Gel manicure",
      price_amount: 700,
      sort_order: 0,
    };
    expect(createServiceDraft(service)).toMatchObject({
      durationMinutes: "90",
      name: "Gel manicure",
      priceAmount: "700",
    });
  });
});
