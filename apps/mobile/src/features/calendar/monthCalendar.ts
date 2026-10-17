import type { WorkspaceAvailabilityRule } from "../../types";
import type { MasterAppointment } from "../appointments/manualBooking";
import {
  type AvailabilityDateOverride,
  getEffectiveAvailability,
} from "../availability/dateOverrides";
import {
  formatDateInTimeZone,
  type PersonalBlock,
} from "../availability/personalBlocks";
import { addCalendarDays, getCalendarDateRange } from "./calendar";
import { calculateCalendarWorkload } from "./calendarWorkload";

export type MonthCalendarDay = {
  readonly bookingCount: number;
  readonly blockCount: number;
  readonly date: string;
  readonly isClosed: boolean;
  readonly isCurrentMonth: boolean;
  readonly isSelected: boolean;
  readonly isToday: boolean;
  readonly workloadPercent: number | null;
};

type BuildMonthCalendarParams = {
  readonly appointments: readonly MasterAppointment[];
  readonly availabilityRules: readonly WorkspaceAvailabilityRule[];
  readonly blocks: readonly PersonalBlock[];
  readonly dateOverrides?: readonly AvailabilityDateOverride[];
  readonly monthDate: string;
  readonly selectedDate: string;
  readonly timezone: string;
  readonly todayDate: string;
};

export function buildMonthCalendar({
  appointments,
  availabilityRules,
  blocks,
  dateOverrides = [],
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
    }
  >();
  for (const appointment of appointments) {
    const date = formatDateInTimeZone(
      new Date(appointment.starts_at),
      timezone,
    );
    const entry = getOrCreateDay(dataByDate, date);
    if (
      appointment.status === "confirmed" ||
      appointment.status === "completed"
    ) {
      entry.bookingCount += 1;
    }
  }

  for (const block of blocks) {
    const date = formatDateInTimeZone(new Date(block.starts_at), timezone);
    getOrCreateDay(dataByDate, date).blockCount += 1;
  }

  const days: MonthCalendarDay[] = [];
  for (let date = gridStart; date <= gridEnd; date = addCalendarDays(date, 1)) {
    const data = dataByDate.get(date);
    const availability = getEffectiveAvailability(
      date,
      availabilityRules,
      dateOverrides,
    );
    const availabilityRule = availability.isClosed
      ? undefined
      : {
          dayOfWeek: getIsoDayOfWeek(date),
          startLocalTime: availability.startLocalTime ?? "00:00",
          endLocalTime: availability.endLocalTime ?? "00:00",
        };
    const workload = calculateCalendarWorkload({
      appointments,
      availabilityRule,
      blocks,
      date,
      timezone,
    });
    days.push({
      bookingCount: data?.bookingCount ?? 0,
      blockCount: data?.blockCount ?? 0,
      date,
      isClosed: availability.isClosed,
      isCurrentMonth: date >= monthRange.fromDate && date <= monthRange.toDate,
      isSelected: date === selectedDate,
      isToday: date === todayDate,
      workloadPercent: workload.percent,
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
    }
  >,
  date: string,
) {
  let day = days.get(date);
  if (!day) {
    day = { bookingCount: 0, blockCount: 0 };
    days.set(date, day);
  }
  return day;
}

function getIsoDayOfWeek(value: string): number {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  return day || 7;
}
