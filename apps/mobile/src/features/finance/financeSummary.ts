import type { MasterAppointment } from "../appointments/manualBooking";
import { formatDateInTimeZone } from "../availability/personalBlocks";
import { getCalendarDateRange } from "../calendar/calendar";

export type FinanceAppointment = Pick<
  MasterAppointment,
  | "currency"
  | "customer_id"
  | "duration_minutes"
  | "is_new_customer"
  | "is_returning_customer"
  | "paid_amount"
  | "price_amount"
  | "starts_at"
  | "status"
>;

export type FinanceMonthSummary = {
  readonly bookedMinutes: number;
  readonly canceledCount: number;
  readonly completedCount: number;
  readonly expectedByCurrency: Readonly<Record<string, number>>;
  readonly newCustomerCount: number;
  readonly noShowCount: number;
  readonly paidByCurrency: Readonly<Record<string, number>>;
  readonly returningCustomerCount: number;
  readonly upcomingCount: number;
};

type SummarizeFinanceRangeParams = {
  readonly appointments: readonly FinanceAppointment[];
  readonly fromDate: string;
  readonly now: Date;
  readonly toDate: string;
  readonly timezone: string;
};

export function summarizeFinanceRange({
  appointments,
  fromDate,
  now,
  toDate,
  timezone,
}: SummarizeFinanceRangeParams): FinanceMonthSummary {
  const nowTimestamp = now.getTime();
  let completedCount = 0;
  let upcomingCount = 0;
  let canceledCount = 0;
  let noShowCount = 0;
  let bookedMinutes = 0;
  const newCustomers = new Set<string>();
  const paidByCurrency: Record<string, number> = {};
  const expectedByCurrency: Record<string, number> = {};
  const returningCustomers = new Set<string>();

  for (const appointment of appointments) {
    const localDate = formatDateInTimeZone(
      new Date(appointment.starts_at),
      timezone,
    );
    if (localDate < fromDate || localDate > toDate) continue;

    if (appointment.status === "completed") {
      completedCount += 1;
      bookedMinutes += appointment.duration_minutes;
      if (appointment.is_new_customer)
        newCustomers.add(appointment.customer_id);
      if (appointment.is_returning_customer) {
        returningCustomers.add(appointment.customer_id);
      }
      addCurrencyAmount(
        paidByCurrency,
        appointment.currency,
        Number(appointment.paid_amount),
      );
      continue;
    }

    if (
      appointment.status === "cancelled_by_customer" ||
      appointment.status === "cancelled_by_master"
    ) {
      canceledCount += 1;
      continue;
    }

    if (appointment.status === "no_show") {
      noShowCount += 1;
      continue;
    }

    if (
      (appointment.status === "pending" ||
        appointment.status === "confirmed") &&
      new Date(appointment.starts_at).getTime() >= nowTimestamp
    ) {
      upcomingCount += 1;
      bookedMinutes += appointment.duration_minutes;
      addCurrencyAmount(
        expectedByCurrency,
        appointment.currency,
        Number(appointment.price_amount),
      );
    }
  }

  return {
    bookedMinutes,
    canceledCount,
    completedCount,
    expectedByCurrency,
    newCustomerCount: newCustomers.size,
    noShowCount,
    paidByCurrency,
    returningCustomerCount: returningCustomers.size,
    upcomingCount,
  };
}

export function summarizeFinanceMonth({
  appointments,
  month,
  now,
  timezone,
}: {
  readonly appointments: readonly FinanceAppointment[];
  readonly month: string;
  readonly now: Date;
  readonly timezone: string;
}): FinanceMonthSummary {
  const range = getCalendarDateRange(month, "month");
  return summarizeFinanceRange({
    appointments,
    fromDate: range.fromDate,
    now,
    toDate: range.toDate,
    timezone,
  });
}

function addCurrencyAmount(
  amounts: Record<string, number>,
  currency: string,
  amount: number,
): void {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!normalizedCurrency || !Number.isFinite(amount)) return;
  amounts[normalizedCurrency] = (amounts[normalizedCurrency] ?? 0) + amount;
}
