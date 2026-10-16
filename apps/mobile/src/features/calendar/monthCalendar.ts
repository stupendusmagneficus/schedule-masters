import type { WorkspaceAvailabilityRule } from "../../types";
import type { MasterAppointment } from "../appointments/manualBooking";
import {
  formatDateInTimeZone,
  type PersonalBlock,
} from "../availability/personalBlocks";
import { addCalendarDays, getCalendarDateRange } from "./calendar";

export type MonthCalendarDay = {
  readonly bookingCount: number;
  readonly blockCount: number;
  readonly date: string;
  readonly expectedRevenueByCurrency: Readonly<Record<string, number>>;
  readonly isClosed: boolean;
  readonly isCurrentMonth: boolean;
  readonly isSelected: boolean;
  readonly isToday: boolean;
};

type BuildMonthCalendarParams = {
  readonly appointments: readonly MasterAppointment[];
  readonly availabilityRules: readonly WorkspaceAvailabilityRule[];
  readonly blocks: readonly PersonalBlock[];
  readonly monthDate: string;
  readonly selectedDate: string;
  readonly timezone: string;
  readonly todayDate: string;
};

export function buildMonthCalendar({
  appointments,
  availabilityRules,
  blocks,
  monthDate,
  selectedDate,
  timezone,
  todayDate,
}: BuildMonthCalendarParams): MonthCalendarDay[] {
  const monthRange = getCalendarDateRange(monthDate, "month");
  const gridStart = addCalendarDays(
    monthRange.fromDate,
    1 - getIsoDayOfWeek(monthRange.fromDate),
  );
  const gridEnd = addCalendarDays(gridStart, 41);
  const dataByDate = new Map<
    string,
    {
      bookingCount: number;
      blockCount: number;
      revenue: Record<string, number>;
    }
  >();
  const rulesByDay = new Set(availabilityRules.map((rule) => rule.dayOfWeek));

  for (const appointment of appointments) {
    const date = formatDateInTimeZone(
      new Date(appointment.starts_at),
      timezone,
    );
    const entry = getOrCreateDay(dataByDate, date);
    if (
      appointment.status !== "cancelled_by_customer" &&
      appointment.status !== "cancelled_by_master"
    ) {
      entry.bookingCount += 1;
    }
    if (
      appointment.status === "pending" ||
      appointment.status === "confirmed" ||
      appointment.status === "completed"
    ) {
      const currency = appointment.currency.trim().toUpperCase();
      entry.revenue[currency] =
        (entry.revenue[currency] ?? 0) + Number(appointment.price_amount);
    }
  }

  for (const block of blocks) {
    const date = formatDateInTimeZone(new Date(block.starts_at), timezone);
    getOrCreateDay(dataByDate, date).blockCount += 1;
  }

  const days: MonthCalendarDay[] = [];
  for (let date = gridStart; date <= gridEnd; date = addCalendarDays(date, 1)) {
    const data = dataByDate.get(date);
    days.push({
      bookingCount: data?.bookingCount ?? 0,
      blockCount: data?.blockCount ?? 0,
      date,
      expectedRevenueByCurrency: data?.revenue ?? {},
      isClosed: !rulesByDay.has(getIsoDayOfWeek(date)),
      isCurrentMonth: date >= monthRange.fromDate && date <= monthRange.toDate,
      isSelected: date === selectedDate,
      isToday: date === todayDate,
    });
  }

  return days;
}

function getOrCreateDay(
  days: Map<
    string,
    {
      bookingCount: number;
      blockCount: number;
      revenue: Record<string, number>;
    }
  >,
  date: string,
) {
  let day = days.get(date);
  if (!day) {
    day = { bookingCount: 0, blockCount: 0, revenue: {} };
    days.set(date, day);
  }
  return day;
}

function getIsoDayOfWeek(value: string): number {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  return day || 7;
}
