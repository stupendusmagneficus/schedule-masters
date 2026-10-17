import type { PublicBookingService } from "@schedule-app/api";
import { describe, expect, it } from "vitest";
import { getServiceSelectionSummary } from "./serviceSelection";

const manicure: PublicBookingService = {
  id: "manicure",
  name: "Manicure",
  description: null,
  category: "Hands",
  durationMinutes: 90,
  priceAmount: 800,
  currency: "CZK",
};

const pedicure: PublicBookingService = {
  id: "pedicure",
  name: "Pedicure",
  description: null,
  category: "Feet",
  durationMinutes: 60,
  priceAmount: 600,
  currency: "CZK",
};

describe("getServiceSelectionSummary", () => {
  it("totals the duration and price of selected services", () => {
    expect(getServiceSelectionSummary([manicure, pedicure])).toEqual({
      durationMinutes: 150,
      priceAmount: 1400,
    });
  });

  it("returns zero totals for an empty selection", () => {
    expect(getServiceSelectionSummary([])).toEqual({
      durationMinutes: 0,
      priceAmount: 0,
    });
  });
});
