import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDateInTimeZone } from "../availability/personalBlocks";
import type { FinanceAppointment, FinanceMonthSummary } from "./financeSummary";
import { summarizeFinanceRange } from "./financeSummary";

export type WeeklyPaidAmount = {
  readonly amount: number;
  readonly currency: string;
  readonly weekIndex: number;
};

export type FinanceReport = FinanceMonthSummary & {
  readonly appointmentCount: number;
  readonly weeklyPaid: readonly WeeklyPaidAmount[];
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Finance report is invalid");
  }
  return value as Record<string, unknown>;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Finance report is invalid");
  }
  return value;
}

function amount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Finance report is invalid");
  }
  return value;
}

function currencyAmounts(value: unknown): Record<string, number> {
  const values = record(value);
  const amounts: Record<string, number> = {};
  for (const [currency, value] of Object.entries(values)) {
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Finance report is invalid");
    }
    amounts[currency] = amount(value);
  }
  return amounts;
}

export function parseFinanceReport(value: unknown): FinanceReport {
  const data = record(value);
  if (!Array.isArray(data.weeklyPaid)) {
    throw new Error("Finance report is invalid");
  }
  return {
    appointmentCount: count(data.appointmentCount),
    bookedMinutes: count(data.bookedMinutes),
    canceledCount: count(data.canceledCount),
    completedCount: count(data.completedCount),
    expectedByCurrency: currencyAmounts(data.expectedByCurrency),
    newCustomerCount: count(data.newCustomerCount),
    noShowCount: count(data.noShowCount),
    paidByCurrency: currencyAmounts(data.paidByCurrency),
    returningCustomerCount: count(data.returningCustomerCount),
    upcomingCount: count(data.upcomingCount),
    weeklyPaid: data.weeklyPaid.map((raw) => {
      const week = record(raw);
      if (
        typeof week.currency !== "string" ||
        !/^[A-Z]{3}$/.test(week.currency)
      ) {
        throw new Error("Finance report is invalid");
      }
      return {
        amount: amount(week.amount),
        currency: week.currency,
        weekIndex: count(week.weekIndex),
      };
    }),
  };
}

export async function loadMasterFinanceReport(
  client: SupabaseClient<Database>,
  workspaceId: string,
  fromDate: string,
  toDate: string,
): Promise<FinanceReport> {
  const { data, error } = await client.rpc("get_master_finance_report", {
    p_workspace_id: workspaceId,
    p_from_date: fromDate,
    p_to_date: toDate,
  });
  if (error) throw new Error("Finance report unavailable");
  return parseFinanceReport(data);
}

export function summarizeDemoFinanceReport({
  appointments,
  fromDate,
  now,
  toDate,
  timezone,
}: {
  readonly appointments: readonly FinanceAppointment[];
  readonly fromDate: string;
  readonly now: Date;
  readonly toDate: string;
  readonly timezone: string;
}): FinanceReport {
  const summary = summarizeFinanceRange({
    appointments,
    fromDate,
    now,
    toDate,
    timezone,
  });
  const weeklyAmounts = new Map<string, WeeklyPaidAmount>();
  let appointmentCount = 0;
  const first = Date.parse(`${fromDate}T12:00:00Z`);
  for (const appointment of appointments) {
    const localDate = formatDateInTimeZone(
      new Date(appointment.starts_at),
      timezone,
    );
    if (localDate < fromDate || localDate > toDate) continue;
    appointmentCount++;
    if (appointment.status !== "completed") continue;
    const currency = appointment.currency.trim().toUpperCase();
    const paid = Number(appointment.paid_amount);
    if (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(paid) || paid < 0)
      continue;
    const weekIndex = Math.floor(
      (Date.parse(`${localDate}T12:00:00Z`) - first) / (7 * 86_400_000),
    );
    const key = `${weekIndex}:${currency}`;
    weeklyAmounts.set(key, {
      amount: (weeklyAmounts.get(key)?.amount ?? 0) + paid,
      currency,
      weekIndex,
    });
  }
  return {
    ...summary,
    appointmentCount,
    weeklyPaid: [...weeklyAmounts.values()].sort(
      (left, right) =>
        left.weekIndex - right.weekIndex ||
        left.currency.localeCompare(right.currency),
    ),
  };
}
