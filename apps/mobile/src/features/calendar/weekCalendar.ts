import type { DemoAppointment } from "../../demo/types";
import type { WorkspaceAvailabilityRule } from "../../types";
import type {
  AppointmentStatus,
  MasterAppointment,
} from "../appointments/manualBooking";
import {
  formatDateInTimeZone,
  type PersonalBlock,
} from "../availability/personalBlocks";
import { addCalendarDays, getCalendarDateRange } from "./calendar";
import { getDayTimelineSlotStart, timeToMinutes } from "./dayTimeline";

export type WeekCalendarEvent = {
  readonly appointment?: MasterAppointment;
  readonly block?: PersonalBlock;
  readonly endAt: string;
  readonly id: string;
  readonly kind: "appointment" | "block";
  readonly startAt: string;
  readonly status?: AppointmentStatus;
  readonly subtitle: string;
  readonly title: string;
};

export type WeekCalendarDay = {
  readonly date: string;
  readonly endMinute: number;
  readonly events: readonly WeekCalendarEvent[];
  readonly isClosed: boolean;
  readonly startMinute: number;
};

export type WeekCalendarMonthDay = {
  readonly date: string;
  readonly dayOfMonth: number;
  readonly hasEvents: boolean;
  readonly isClosed: boolean;
  readonly isCurrentMonth: boolean;
  readonly isSelectedWeek: boolean;
};

type BuildWeekCalendarParams = {
  readonly appointments: readonly MasterAppointment[];
  readonly availabilityRules: readonly WorkspaceAvailabilityRule[];
  readonly blocks: readonly PersonalBlock[];
  readonly selectedDate: string;
  readonly timezone: string;
};

export function buildWeekCalendar({
  appointments,
  availabilityRules,
  blocks,
  selectedDate,
  timezone,
}: BuildWeekCalendarParams): WeekCalendarDay[] {
  const { fromDate } = getCalendarDateRange(selectedDate, "week");
  const dates = Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(fromDate, index),
  );
  const days = dates.map((date) => {
    const rule = availabilityRules.find(
      (candidate) => candidate.dayOfWeek === getIsoDayOfWeek(date),
    );

    return {
      date,
      endMinute: rule ? timeToMinutes(rule.endLocalTime) : 20 * 60,
      events: [] as WeekCalendarEvent[],
      isClosed: !rule,
      startMinute: rule ? timeToMinutes(rule.startLocalTime) : 8 * 60,
    };
  });
  const daysByDate = new Map(days.map((day) => [day.date, day]));

  for (const appointment of appointments) {
    const date = formatDateInTimeZone(
      new Date(appointment.starts_at),
      timezone,
    );
    const day = daysByDate.get(date);
    if (!day) continue;
    day.events.push({
      appointment,
      endAt: appointment.ends_at,
      id: appointment.id,
      kind: "appointment",
      startAt: appointment.starts_at,
      status: appointment.status,
      subtitle: appointment.service_name,
      title: appointment.customer_name,
    });
  }

  for (const block of blocks) {
    const date = formatDateInTimeZone(new Date(block.starts_at), timezone);
    const day = daysByDate.get(date);
    if (!day) continue;
    day.events.push({
      block,
      endAt: block.ends_at,
      id: block.id,
      kind: "block",
      startAt: block.starts_at,
      subtitle: "",
      title: block.reason || "Personal block",
    });
  }

  return days.map((day) => ({
    ...day,
    events: [...day.events].sort(
      (left, right) =>
        new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
    ),
  }));
}

export function buildDemoWeekCalendar(
  appointments: readonly DemoAppointment[],
  selectedDate: string,
  timezone: string,
): WeekCalendarDay[] {
  const { fromDate } = getCalendarDateRange(selectedDate, "week");
  const days = Array.from({ length: 7 }, (_, index) => ({
    date: addCalendarDays(fromDate, index),
    endMinute: 21 * 60,
    events: [] as WeekCalendarEvent[],
    isClosed: false,
    startMinute: 8 * 60,
  }));

  appointments.forEach((appointment, index) => {
    const date = days[index % days.length]?.date;
    if (!date) return;
    const startAt = getDayTimelineSlotStart(
      date,
      timeToMinutes(appointment.startsAt),
      timezone,
    );
    const endAt = new Date(
      new Date(startAt).getTime() + appointment.durationMinutes * 60_000,
    ).toISOString();
    days[index % days.length]?.events.push({
      endAt,
      id: appointment.id,
      kind: "appointment",
      startAt,
      subtitle: appointment.serviceName,
      title: appointment.clientName,
    });
  });

  return days;
}

export function buildWeekCalendarMonth(
  selectedDate: string,
  days: readonly WeekCalendarDay[],
): WeekCalendarMonthDay[] {
  const monthRange = getCalendarDateRange(selectedDate, "month");
  const firstWeekday = getIsoDayOfWeek(monthRange.fromDate);
  const lastWeekday = getIsoDayOfWeek(monthRange.toDate);
  const gridStart = addCalendarDays(monthRange.fromDate, 1 - firstWeekday);
  const gridEnd = addCalendarDays(monthRange.toDate, 7 - lastWeekday);
  const selectedWeek = new Set(days.map((day) => day.date));
  const daysByDate = new Map(days.map((day) => [day.date, day]));
  const monthDays: WeekCalendarMonthDay[] = [];

  for (let date = gridStart; date <= gridEnd; date = addCalendarDays(date, 1)) {
    const day = daysByDate.get(date);
    monthDays.push({
      date,
      dayOfMonth: Number(date.slice(-2)),
      hasEvents: Boolean(day?.events.length),
      isClosed: day?.isClosed ?? false,
      isCurrentMonth: date >= monthRange.fromDate && date <= monthRange.toDate,
      isSelectedWeek: selectedWeek.has(date),
    });
  }

  return monthDays;
}

function getIsoDayOfWeek(value: string): number {
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.getUTCDay() || 7;
}
