import { describe, expect, it } from "vitest";
import { sumReceivedRevenue } from "./todayRevenue";

describe("sumReceivedRevenue", () => {
  it("starts at zero and counts only saved payments for completed appointments", () => {
    expect(sumReceivedRevenue([])).toBe(0);
    expect(
      sumReceivedRevenue([
        { paid_amount: 0, status: "confirmed" },
        { paid_amount: 0, status: "completed" },
        { paid_amount: 1222, status: "completed" },
        { paid_amount: 800, status: "cancelled_by_master" },
      ]),
    ).toBe(1222);
  });

  it("adds fractional payments without floating-point drift", () => {
    expect(
      sumReceivedRevenue([
        { paid_amount: 0.1, status: "completed" },
        { paid_amount: 0.2, status: "completed" },
      ]),
    ).toBe(0.3);
  });
});
