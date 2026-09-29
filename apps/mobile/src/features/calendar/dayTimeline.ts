import type { DemoAppointment } from "../../demo/types";
import type { WorkspaceAvailabilityRule } from "../../types";
import type { MasterAppointment } from "../appointments/manualBooking";
import type { PersonalBlock } from "../availability/personalBlocks";

export const timelineSlotMinutes = 30;
export const timelineSlotHeight = 48;

export type DayTimelineSlot = {
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
  selectedDate,
  timezone,
}: BuildDayTimelineParams): DayTimeline {
  const dayOfWeek = getIsoDayOfWeek(selectedDate);
  const rule = availabilityRules.find(
    (candidate) => candidate.dayOfWeek === dayOfWeek,
  );
  const startMinute = rule ? timeToMinutes(rule.startLocalTime) : 0;
  const endMinute = rule ? timeToMinutes(rule.endLocalTime) : 0;

  if (!rule || endMinute <= startMinute) {
    return {
      endMinute,
      events: [],
      isClosed: true,
      slots: [],
      startMinute,
    };
  }

  const events = [
    ...appointments.flatMap((appointment) => {
      const start = getLocalTime(appointment.starts_at, timezone);
      const end = getLocalTime(appointment.ends_at, timezone);
      if (
        start.date !== selectedDate ||
        end.date !== selectedDate ||
        end.minute <= startMinute ||
        start.minute >= endMinute
      ) {
        return [];
      }

      return [
        {
          appointment,
          endMinute: clamp(end.minute, startMinute, endMinute),
          id: appointment.id,
          kind: "appointment" as const,
          startMinute: clamp(start.minute, startMinute, endMinute),
          subtitle: appointment.service_name,
          title: appointment.customer_name,
        },
      ];
    }),
    ...blocks.flatMap((block) => {
      const start = getLocalTime(block.starts_at, timezone);
      const end = getLocalTime(block.ends_at, timezone);
      if (
        start.date !== selectedDate ||
        end.date !== selectedDate ||
        end.minute <= startMinute ||
        start.minute >= endMinute
      ) {
        return [];
      }

      return [
        {
          block,
          endMinute: clamp(end.minute, startMinute, endMinute),
          id: block.id,
          kind: "block" as const,
          startMinute: clamp(start.minute, startMinute, endMinute),
          subtitle: "",
          title: block.reason || "Personal block",
        },
      ];
    }),
  ].sort((left, right) => left.startMinute - right.startMinute);

  return {
    endMinute,
    events,
    isClosed: false,
    slots: createTimelineSlots(startMinute, endMinute),
    startMinute,
  };
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
    slots.push({ label: formatTimelineTime(minute), minute });
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

function getIsoDayOfWeek(value: string): number {
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.getUTCDay() || 7;
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
