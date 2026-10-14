import { describe, expect, it } from "vitest";

import {
  type FinanceAppointment,
  summarizeFinanceMonth,
} from "./financeSummary";

const appointment = (
  id: string,
  startsAt: string,
  status: FinanceAppointment["status"],
  overrides: Partial<FinanceAppointment> = {},
) => ({
  currency: "CZK",
  customer_id: id,
  duration_minutes: 60,
  is_new_customer: false,
  is_returning_customer: false,
  paid_amount: 0,
  price_amount: 700,
  starts_at: startsAt,
  status,
  ...overrides,
  id,
});

describe("monthly finance summary", () => {
  it("returns an empty summary when the selected month has no appointments", () => {
    const summary = summarizeFinanceMonth({
      appointments: [],
      month: "2030-02-01",
      now: new Date("2030-02-15T00:00:00.000Z"),
      timezone: "UTC",
    });

    expect(summary).toEqual({
      bookedMinutes: 0,
      canceledCount: 0,
      completedCount: 0,
      expectedByCurrency: {},
      newCustomerCount: 0,
      noShowCount: 0,
      paidByCurrency: {},
      returningCustomerCount: 0,
      upcomingCount: 0,
    });
  });

  it("uses recorded payments instead of completed appointment prices", () => {
    const summary = summarizeFinanceMonth({
      appointments: [
        appointment("future", "2030-02-20T09:00:00.000Z", "confirmed"),
        appointment("partial", "2030-02-10T09:00:00.000Z", "completed", {
          paid_amount: 350,
        }),
        appointment("unpaid", "2030-02-11T09:00:00.000Z", "completed"),
        appointment(
          "cancelled",
          "2030-02-12T09:00:00.000Z",
          "cancelled_by_master",
        ),
        appointment("no-show", "2030-02-13T09:00:00.000Z", "no_show"),
        appointment("past-pending", "2030-02-14T09:00:00.000Z", "pending"),
        appointment("outside", "2030-03-01T00:00:00.000Z", "confirmed"),
      ],
      month: "2030-02-01",
      now: new Date("2030-02-15T00:00:00.000Z"),
      timezone: "UTC",
    });

    expect(summary).toMatchObject({
      bookedMinutes: 180,
      canceledCount: 1,
      completedCount: 2,
      expectedByCurrency: { CZK: 700 },
      newCustomerCount: 0,
      noShowCount: 1,
      paidByCurrency: { CZK: 350 },
      returningCustomerCount: 0,
      upcomingCount: 1,
    });
  });

  it("uses the workspace timezone when assigning an appointment to a month", () => {
    const summary = summarizeFinanceMonth({
      appointments: [
        appointment(
          "prague-february",
          "2030-01-31T23:30:00.000Z",
          "completed",
          {
            paid_amount: 700,
          },
        ),
      ],
      month: "2030-02-01",
      now: new Date("2030-02-01T00:00:00.000Z"),
      timezone: "Europe/Prague",
    });

    expect(summary.completedCount).toBe(1);
    expect(summary.paidByCurrency).toEqual({ CZK: 700 });
  });

  it("keeps paid and expected totals separate for different currencies", () => {
    const summary = summarizeFinanceMonth({
      appointments: [
        appointment("czk", "2030-02-20T09:00:00.000Z", "confirmed"),
        appointment("eur", "2030-02-21T09:00:00.000Z", "pending", {
          currency: "EUR",
          price_amount: 20,
        }),
        appointment("paid-eur", "2030-02-10T09:00:00.000Z", "completed", {
          currency: "EUR",
          paid_amount: 15,
          price_amount: 20,
        }),
      ],
      month: "2030-02-01",
      now: new Date("2030-02-15T00:00:00.000Z"),
      timezone: "UTC",
    });

    expect(summary.expectedByCurrency).toEqual({ CZK: 700, EUR: 20 });
    expect(summary.paidByCurrency).toEqual({ EUR: 15 });
  });

  it("counts unique first-time and returning customers among completed visits", () => {
    const summary = summarizeFinanceMonth({
      appointments: [
        appointment("new-visit-1", "2030-02-10T09:00:00.000Z", "completed", {
          customer_id: "new-customer",
          is_new_customer: true,
        }),
        appointment("new-visit-2", "2030-02-12T09:00:00.000Z", "completed", {
          customer_id: "new-customer",
          is_new_customer: true,
        }),
        appointment(
          "returning-visit",
          "2030-02-13T09:00:00.000Z",
          "completed",
          { customer_id: "returning-customer", is_returning_customer: true },
        ),
        appointment(
          "upcoming-customer",
          "2030-02-20T09:00:00.000Z",
          "confirmed",
          {
            customer_id: "future-customer",
            is_new_customer: true,
          },
        ),
      ],
      month: "2030-02-01",
      now: new Date("2030-02-15T00:00:00.000Z"),
      timezone: "UTC",
    });

    expect(summary.newCustomerCount).toBe(1);
    expect(summary.returningCustomerCount).toBe(1);
  });
});
