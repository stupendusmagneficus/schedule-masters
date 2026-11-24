import type { DemoAppointment } from "../../demo/types";
import type { WorkspaceAvailabilityRule } from "../../types";
import type { MasterAppointment } from "../appointments/manualBooking";
import {
  type AvailabilityDateOverride,
  getEffectiveAvailability,
} from "../availability/dateOverrides";
import type { PersonalBlock } from "../availability/personalBlocks";

export const timelineSlotMinutes = 30;
export const timelineSlotHeight = 48;

export type DayTimelineSlot = {
  /** False outside working hours; such rows only show existing events. */
  readonly bookable: boolean;
  readonly label: string;
  readonly minute: number;
};

export type DayTimelineEvent = {
  readonly appointment?: MasterAppointment;
  readonly block?: PersonalBlock;
  readonly endMinute: number;
  readonly id: string;
  readonly kind: "appointment" | "block";
  readonly startMinute: number;
  readonly subtitle: string;
  readonly title: string;
};

export type DayTimeline = {
  readonly endMinute: number;
  readonly events: readonly DayTimelineEvent[];
  readonly isClosed: boolean;
  readonly slots: readonly DayTimelineSlot[];
  readonly startMinute: number;
};

type BuildDayTimelineParams = {
  readonly appointments: readonly MasterAppointment[];
  readonly availabilityRules: readonly WorkspaceAvailabilityRule[];
  readonly blocks: readonly PersonalBlock[];
  readonly dateOverrides?: readonly AvailabilityDateOverride[];
  readonly selectedDate: string;
  readonly timezone: string;
};

type LocalTime = {
  readonly date: string;
  readonly minute: number;
};

export function buildDayTimeline({
  appointments,
  availabilityRules,
  blocks,
  dateOverrides = [],
  selectedDate,
  timezone,
}: BuildDayTimelineParams): DayTimeline {
  const effectiveAvailability = getEffectiveAvailability(
    selectedDate,
    availabilityRules,
    dateOverrides,
  );
  const workStart = effectiveAvailability.startLocalTime
    ? timeToMinutes(effectiveAvailability.startLocalTime)
    : 0;
  const workEnd = effectiveAvailability.endLocalTime
    ? timeToMinutes(effectiveAvailability.endLocalTime)
    : 0;
  const isOpen = !effectiveAvailability.isClosed && workEnd > workStart;

  const appointmentEvents = appointments.flatMap((appointment) => {
    if (
      appointment.status === "cancelled_by_master" ||
      appointment.status === "cancelled_by_customer"
    )
      return [];
    const range = getLocalRange(
      appointment.starts_at,
      appointment.ends_at,
      selectedDate,
      timezone,
    );
    if (!range) return [];
    return [
      {
        appointment,
        ...range,
        id: appointment.id,
        kind: "appointment" as const,
        subtitle: appointment.service_name,
        title: appointment.customer_name,
      },
    ];
  });
  const blockEvents = blocks.flatMap((block) => {
    const range = getLocalRange(
      block.starts_at,
      block.ends_at,
      selectedDate,
      timezone,
    );
    if (!range) return [];
    return [
      {
        block,
        ...range,
        id: block.id,
        kind: "block" as const,
        subtitle: "",
        title: block.reason || "Personal block",
      },
    ];
  });
  const events = [...appointmentEvents, ...blockEvents].sort(
    (left, right) => left.startMinute - right.startMinute,
  );

  if (!isOpen && events.length === 0) {
    return {
      endMinute: workEnd,
      events: [],
      isClosed: true,
      slots: [],
      startMinute: workStart,
    };
  }

  // Bookings made before hours changed or the day was closed stay visible.
  const startMinute = Math.min(
    isOpen ? workStart : Number.POSITIVE_INFINITY,
    ...events.map((event) => floorToSlot(event.startMinute)),
  );
  const endMinute = Math.max(
    isOpen ? workEnd : Number.NEGATIVE_INFINITY,
    ...events.map((event) => ceilToSlot(event.endMinute)),
  );

  return {
    endMinute,
    events,
    isClosed: !isOpen,
    slots: createTimelineSlots(startMinute, endMinute).map((slot) => ({
      ...slot,
      bookable: isOpen && slot.minute >= workStart && slot.minute < workEnd,
    })),
    startMinute,
  };
}

function getLocalRange(
  startsAt: string,
  endsAt: string,
  selectedDate: string,
  timezone: string,
): { readonly endMinute: number; readonly startMinute: number } | null {
  const start = getLocalTime(startsAt, timezone);
  const end = getLocalTime(endsAt, timezone);
  if (start.date !== selectedDate || end.date !== selectedDate) return null;
  if (end.minute <= start.minute) return null;
  return { endMinute: end.minute, startMinute: start.minute };
}

function floorToSlot(minute: number): number {
  return Math.floor(minute / timelineSlotMinutes) * timelineSlotMinutes;
}

function ceilToSlot(minute: number): number {
  return Math.ceil(minute / timelineSlotMinutes) * timelineSlotMinutes;
}

export function buildDemoDayTimeline(
  appointments: readonly DemoAppointment[],
  startMinute = 8 * 60,
  endMinute = 21 * 60,
): DayTimeline {
  const events = appointments
    .map((appointment) => {
      const startMinute = timeToMinutes(appointment.startsAt);
      return {
        endMinute: Math.min(
          startMinute + appointment.durationMinutes,
          endMinute,
        ),
        id: appointment.id,
        kind: "appointment" as const,
        startMinute,
        subtitle: appointment.serviceName,
        title: appointment.clientName,
      };
    })
    .filter((event) => event.startMinute < endMinute)
    .map((event) => ({
      ...event,
      endMinute: Math.max(
        event.endMinute,
        event.startMinute + timelineSlotMinutes,
      ),
    }));

  return {
    endMinute,
    events,
    isClosed: false,
    slots: createTimelineSlots(startMinute, endMinute),
    startMinute,
  };
}

export function createTimelineSlots(
  startMinute: number,
  endMinute: number,
): DayTimelineSlot[] {
  const slots: DayTimelineSlot[] = [];
  for (
    let minute = startMinute;
    minute < endMinute;
    minute += timelineSlotMinutes
  ) {
    slots.push({ bookable: true, label: formatTimelineTime(minute), minute });
  }
  return slots;
}

export function formatTimelineTime(minute: number): string {
  const hours = Math.floor(minute / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (minute % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getDayTimelineSlotStart(
  date: string,
  minute: number,
  timezone: string,
): string {
  const [year, month, day] = date.split("-").map(Number);
  const hour = Math.floor(minute / 60);
  const localMinute = minute % 60;
  const utcGuess = Date.UTC(year, month - 1, day, hour, localMinute);
  const guessParts = getLocalDateTimeParts(new Date(utcGuess), timezone);
  const representedUtc = Date.UTC(
    guessParts.year,
    guessParts.month - 1,
    guessParts.day,
    guessParts.hour,
    guessParts.minute,
  );
  const offset = representedUtc - utcGuess;
  return new Date(utcGuess - offset).toISOString();
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function getLocalTime(value: string, timezone: string): LocalTime {
  const parts = getLocalDateTimeParts(new Date(value), timezone);
  return {
    date: `${parts.year.toString().padStart(4, "0")}-${parts.month
      .toString()
      .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`,
    minute: parts.hour * 60 + parts.minute,
  };
}

function getLocalDateTimeParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    month: values.month,
    year: values.year,
  };
}
