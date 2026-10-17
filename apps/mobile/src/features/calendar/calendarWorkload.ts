import type { WorkspaceAvailabilityRule } from "../../types";
import type { MasterAppointment } from "../appointments/manualBooking";
import type { PersonalBlock } from "../availability/personalBlocks";
import { getDayTimelineSlotStart, timeToMinutes } from "./dayTimeline";

const MINUTE_MS = 60_000;

type TimeInterval = {
  readonly end: number;
  readonly start: number;
};

export type CalendarWorkload = {
  readonly availableMinutes: number;
  readonly bookedMinutes: number;
  readonly percent: number | null;
};

export type CalendarWorkloadLevel = "low" | "medium" | "high";

const MEDIUM_WORKLOAD_THRESHOLD_PERCENT = 30;
const HIGH_WORKLOAD_THRESHOLD_PERCENT = 70;

export function getCalendarWorkloadLevel(
  workloadPercent: number | null,
): CalendarWorkloadLevel {
  if (
    workloadPercent === null ||
    workloadPercent < MEDIUM_WORKLOAD_THRESHOLD_PERCENT
  ) {
    return "low";
  }
  if (workloadPercent < HIGH_WORKLOAD_THRESHOLD_PERCENT) return "medium";
  return "high";
}

type CalculateCalendarWorkloadParams = {
  readonly appointments: readonly MasterAppointment[];
  readonly availabilityRule: WorkspaceAvailabilityRule | undefined;
  readonly blocks: readonly PersonalBlock[];
  readonly date: string;
  readonly timezone: string;
};

export function calculateCalendarWorkload({
  appointments,
  availabilityRule,
  blocks,
  date,
  timezone,
}: CalculateCalendarWorkloadParams): CalendarWorkload {
  if (!availabilityRule) return emptyWorkload;

  const dayStart = getDayTimelineSlotStart(
    date,
    timeToMinutes(availabilityRule.startLocalTime),
    timezone,
  );
  const dayEnd = getDayTimelineSlotStart(
    date,
    timeToMinutes(availabilityRule.endLocalTime),
    timezone,
  );
  const start = new Date(dayStart).getTime();
  const end = new Date(dayEnd).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return emptyWorkload;
  }

  const workingHours = [{ start, end }];
  const blocked = mergeIntervals(
    blocks.map((block) => ({
      end: new Date(block.ends_at).getTime(),
      start: new Date(block.starts_at).getTime(),
    })),
  );
  const available = subtractIntervals(workingHours, blocked);
  const availableMinutes = sumDuration(available);
  if (availableMinutes === 0) {
    return { availableMinutes, bookedMinutes: 0, percent: null };
  }

  const acceptedAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "confirmed" || appointment.status === "completed",
  );
  const booked = mergeIntervals(
    acceptedAppointments.map((appointment) => ({
      end: new Date(appointment.ends_at).getTime(),
      start: new Date(appointment.starts_at).getTime(),
    })),
  );
  const bookedDuringAvailableHours = mergeIntervals(
    available.flatMap((interval) => clipIntervals(booked, interval)),
  );
  const bookedMinutes = Math.min(
    availableMinutes,
    sumDuration(bookedDuringAvailableHours),
  );

  return {
    availableMinutes,
    bookedMinutes,
    percent: Math.min(
      100,
      Math.round((bookedMinutes / availableMinutes) * 100),
    ),
  };
}

const emptyWorkload: CalendarWorkload = {
  availableMinutes: 0,
  bookedMinutes: 0,
  percent: null,
};

function mergeIntervals(intervals: readonly TimeInterval[]): TimeInterval[] {
  const sorted = intervals
    .filter(
      (interval) =>
        Number.isFinite(interval.start) &&
        Number.isFinite(interval.end) &&
        interval.end > interval.start,
    )
    .sort((left, right) => left.start - right.start);
  const merged: TimeInterval[] = [];

  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (!previous || interval.start > previous.end) {
      merged.push({ ...interval });
    } else if (interval.end > previous.end) {
      merged[merged.length - 1] = { ...previous, end: interval.end };
    }
  }
  return merged;
}

function subtractIntervals(
  source: readonly TimeInterval[],
  excluded: readonly TimeInterval[],
): TimeInterval[] {
  const result: TimeInterval[] = [];
  for (const interval of source) {
    const clippedExcluded = clipIntervals(excluded, interval);
    let cursor = interval.start;
    for (const excludedInterval of clippedExcluded) {
      if (excludedInterval.start > cursor) {
        result.push({ start: cursor, end: excludedInterval.start });
      }
      cursor = Math.max(cursor, excludedInterval.end);
    }
    if (cursor < interval.end)
      result.push({ start: cursor, end: interval.end });
  }
  return result;
}

function clipIntervals(
  intervals: readonly TimeInterval[],
  bounds: TimeInterval,
): TimeInterval[] {
  return intervals.flatMap((interval) => {
    const start = Math.max(interval.start, bounds.start);
    const end = Math.min(interval.end, bounds.end);
    return end > start ? [{ start, end }] : [];
  });
}

function sumDuration(intervals: readonly TimeInterval[]): number {
  return intervals.reduce(
    (total, interval) => total + (interval.end - interval.start) / MINUTE_MS,
    0,
  );
}
