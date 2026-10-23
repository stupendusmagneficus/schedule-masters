import { describe, expect, it } from "vitest";

import {
  parseFinanceReport,
  summarizeDemoFinanceReport,
} from "./financeReport";

const validReport = {
  appointmentCount: 3,
  bookedMinutes: 180,
  canceledCount: 1,
  completedCount: 1,
  expectedByCurrency: { CZK: 800 },
  newCustomerCount: 1,
  noShowCount: 0,
  paidByCurrency: { EUR: 12.5 },
  returningCustomerCount: 0,
  upcomingCount: 1,
  weeklyPaid: [{ amount: 12.5, currency: "EUR", weekIndex: 0 }],
};

describe("finance report contract", () => {
  it("accepts a sanitized aggregate for multiple currencies", () => {
    expect(parseFinanceReport(validReport)).toEqual(validReport);
  });

  it("rejects malformed or non-finite sums instead of showing a partial report", () => {
    expect(() =>
      parseFinanceReport({
        ...validReport,
        paidByCurrency: { EUR: "12.5" },
      }),
    ).toThrow();
    expect(() =>
      parseFinanceReport({
        ...validReport,
        weeklyPaid: [{ amount: 12.5, currency: "EUR", weekIndex: -1 }],
      }),
    ).toThrow();
    expect(() => parseFinanceReport(null)).toThrow();
  });

  it("keeps demo reports aligned with the backend weekly and count contract", () => {
    const report = summarizeDemoFinanceReport({
      appointments: [
        {
          currency: "EUR",
          customer_id: "client",
          duration_minutes: 90,
          is_new_customer: true,
          is_returning_customer: false,
          paid_amount: 12.5,
          price_amount: 20,
          starts_at: "2030-01-07T09:00:00Z",
          status: "completed",
        },
        {
          currency: "CZK",
          customer_id: "client-2",
          duration_minutes: 60,
          is_new_customer: false,
          is_returning_customer: false,
          paid_amount: 0,
          price_amount: 800,
          starts_at: "2030-01-15T09:00:00Z",
          status: "confirmed",
        },
      ],
      fromDate: "2030-01-01",
      toDate: "2030-01-31",
      timezone: "UTC",
      now: new Date("2030-01-10T00:00:00Z"),
    });
    expect(report.appointmentCount).toBe(2);
    expect(report.completedCount).toBe(1);
    expect(report.paidByCurrency).toEqual({ EUR: 12.5 });
    expect(report.weeklyPaid).toEqual([
      { amount: 12.5, currency: "EUR", weekIndex: 0 },
    ]);
  });
});
