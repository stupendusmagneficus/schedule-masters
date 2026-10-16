import { describe, expect, it } from "vitest";
import type { Service } from "../../types";
import {
  createServiceDraft,
  filterServices,
  getServiceCategories,
  type ServiceDraft,
  validateServiceDraft,
} from "./serviceCatalog";

const validDraft: ServiceDraft = {
  bufferAfterMinutes: "10",
  bufferBeforeMinutes: "5",
  currency: "CZK",
  category: "Nails",
  description: "Gel manicure with a clean finish.",
  durationMinutes: "90",
  name: "Gel manicure",
  priceAmount: "700",
  sortOrder: "0",
};

const services: Service[] = [
  {
    archived_at: null,
    buffer_after_minutes: 0,
    buffer_before_minutes: 0,
    category: "Manikúra",
    currency: "CZK",
    description: "Gelové nehty",
    duration_minutes: 90,
    id: "gel",
    is_active: true,
    name: "Gelová manikúra",
    price_amount: 900,
    sort_order: 0,
  },
  {
    archived_at: null,
    buffer_after_minutes: 0,
    buffer_before_minutes: 0,
    category: null,
    currency: "CZK",
    description: null,
    duration_minutes: 45,
    id: "classic",
    is_active: true,
    name: "Klasická manikúra",
    price_amount: 500,
    sort_order: 1,
  },
  {
    archived_at: "2026-10-01T00:00:00Z",
    buffer_after_minutes: 0,
    buffer_before_minutes: 0,
    category: "Pedikúra",
    currency: "CZK",
    description: "Starší služba",
    duration_minutes: 60,
    id: "old",
    is_active: false,
    name: "Odstranění",
    price_amount: 300,
    sort_order: 2,
  },
];

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

describe("service catalog filtering", () => {
  it("searches locally by service name and description", () => {
    expect(
      filterServices(services, {
        category: null,
        query: " GELOVÉ ",
        status: "active",
      }).map(({ id }) => id),
    ).toEqual(["gel"]);
    expect(
      filterServices(services, {
        category: null,
        query: "starší",
        status: "archived",
      }).map(({ id }) => id),
    ).toEqual(["old"]);
    expect(
      filterServices(services, {
        category: null,
        query: "gelova manikura",
        status: "active",
      }).map(({ id }) => id),
    ).toEqual(["gel"]);
  });

  it("filters by category and includes uncategorized services", () => {
    expect(
      filterServices(services, {
        category: "Manikúra",
        query: "",
        status: "active",
      }).map(({ id }) => id),
    ).toEqual(["gel"]);
    expect(
      filterServices(services, {
        category: "",
        query: "",
        status: "active",
      }).map(({ id }) => id),
    ).toEqual(["classic"]);
  });

  it("returns unique categories in a stable localized order", () => {
    expect(getServiceCategories([...services, services[0]])).toEqual([
      "Manikúra",
      "Pedikúra",
    ]);
  });

  it("keeps filtering bounded catalogs of fifty services", () => {
    const catalog = Array.from({ length: 50 }, (_, index) => ({
      ...services[0],
      id: `service-${index}`,
      name: `Manicure ${index}`,
    }));

    expect(
      filterServices(catalog, {
        category: "Manikúra",
        query: "manicure",
        status: "active",
      }),
    ).toHaveLength(50);
  });
});
