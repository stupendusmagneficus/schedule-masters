import { describe, expect, it } from "vitest";
import { sumReceivedRevenueByCurrency } from "./todayRevenue";

describe("sumReceivedRevenueByCurrency", () => {
  it("starts empty and counts only saved payments for completed appointments", () => {
    expect(sumReceivedRevenueByCurrency([])).toEqual({});
    expect(
      sumReceivedRevenueByCurrency([
        { currency: "CZK", paid_amount: 0, status: "confirmed" },
        { currency: "CZK", paid_amount: 0, status: "completed" },
        { currency: "CZK", paid_amount: 1222, status: "completed" },
        { currency: "EUR", paid_amount: 300, status: "confirmed" },
        { currency: "CZK", paid_amount: 800, status: "cancelled_by_master" },
        { currency: "CZK", paid_amount: 900, status: "no_show" },
      ]),
    ).toEqual({ CZK: 1222 });
  });

  it("keeps fractional payments precise and separates currencies", () => {
    expect(
      sumReceivedRevenueByCurrency([
        { currency: "CZK", paid_amount: 0.1, status: "completed" },
        { currency: "CZK", paid_amount: 0.2, status: "completed" },
        { currency: "EUR", paid_amount: 0.25, status: "completed" },
      ]),
    ).toEqual({ CZK: 0.3, EUR: 0.25 });
  });
});
