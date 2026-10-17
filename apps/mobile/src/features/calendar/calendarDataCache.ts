import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDateInTimeZone } from "../availability/personalBlocks";
import type { CalendarDateRange } from "./calendar";
import type { CalendarData } from "./calendarData";
import { listCalendarData } from "./calendarData";
import { CalendarRangeCache } from "./calendarRangeCache";

const CALENDAR_CACHE_CAPACITY = 36;
export const CALENDAR_CACHE_STALE_TIME_MS = 60_000;

type CalendarClient = SupabaseClient<Database>;
type CalendarCacheListener = (range: CalendarDateRange | undefined) => void;

const cachesByClient = new WeakMap<
  object,
  Map<string, CalendarRangeCache<CalendarData>>
>();

export function getCachedCalendarData(
  client: CalendarClient,
  workspaceId: string,
  timezone: string,
  range: CalendarDateRange,
): CalendarData | undefined {
  return getCache(client, workspaceId, timezone).get(
    range,
    (entries, requestedRange) =>
      mergeCalendarData(entries, requestedRange, timezone),
  );
}

export function hasCachedCalendarData(
  client: CalendarClient,
  workspaceId: string,
  timezone: string,
  range: CalendarDateRange,
): boolean {
  return getCache(client, workspaceId, timezone).hasFreshData(range);
}

export function loadCachedCalendarData(
  client: CalendarClient,
  workspaceId: string,
  timezone: string,
  range: CalendarDateRange,
): Promise<CalendarData> {
  const cache = getCache(client, workspaceId, timezone);
  return cache.load(
    range,
    (missingRange) => listCalendarData(client, workspaceId, missingRange),
    (entries, requestedRange) =>
      mergeCalendarData(entries, requestedRange, timezone),
  );
}

export function invalidateCalendarDataCache(
  client: CalendarClient,
  workspaceId: string,
  range?: CalendarDateRange,
  notifyListeners = true,
): void {
  const caches = cachesByClient.get(client);
  if (!caches) return;
  for (const [scope, cache] of caches) {
    if (scope.startsWith(`${workspaceId}:`)) {
      cache.invalidate(range, notifyListeners);
    }
  }
}

export function subscribeToCalendarDataInvalidation(
  client: CalendarClient,
  workspaceId: string,
  timezone: string,
  listener: CalendarCacheListener,
): () => void {
  return getCache(client, workspaceId, timezone).subscribe(listener);
}

function getCache(
  client: CalendarClient,
  workspaceId: string,
  timezone: string,
): CalendarRangeCache<CalendarData> {
  let clientCaches = cachesByClient.get(client);
  if (!clientCaches) {
    clientCaches = new Map();
    cachesByClient.set(client, clientCaches);
  }
  const scope = `${workspaceId}:${timezone}`;
  let cache = clientCaches.get(scope);
  if (!cache) {
    cache = new CalendarRangeCache<CalendarData>({
      capacity: CALENDAR_CACHE_CAPACITY,
      staleTimeMs: CALENDAR_CACHE_STALE_TIME_MS,
    });
    clientCaches.set(scope, cache);
  }
  return cache;
}

function mergeCalendarData(
  entries: readonly {
    readonly range: CalendarDateRange;
    readonly value: CalendarData;
  }[],
  range: CalendarDateRange,
  timezone: string,
): CalendarData {
  const appointments = new Map<
    CalendarData["appointments"][number]["id"],
    CalendarData["appointments"][number]
  >();
  const blocks = new Map<
    CalendarData["blocks"][number]["id"],
    CalendarData["blocks"][number]
  >();
  const dateOverrides = new Map<
    CalendarData["dateOverrides"][number]["work_date"],
    CalendarData["dateOverrides"][number]
  >();

  for (const entry of entries) {
    for (const appointment of entry.value.appointments) {
      const localDate = formatDateInTimeZone(
        new Date(appointment.starts_at),
        timezone,
      );
      if (localDate >= range.fromDate && localDate <= range.toDate) {
        appointments.set(appointment.id, appointment);
      }
    }
    for (const block of entry.value.blocks) {
      const localDate = formatDateInTimeZone(
        new Date(block.starts_at),
        timezone,
      );
      if (localDate >= range.fromDate && localDate <= range.toDate) {
        blocks.set(block.id, block);
      }
    }
    for (const override of entry.value.dateOverrides) {
      if (
        override.work_date >= range.fromDate &&
        override.work_date <= range.toDate
      ) {
        dateOverrides.set(override.work_date, override);
      }
    }
  }

  return {
    appointments: [...appointments.values()].sort((left, right) =>
      left.starts_at.localeCompare(right.starts_at),
    ),
    blocks: [...blocks.values()].sort((left, right) =>
      left.starts_at.localeCompare(right.starts_at),
    ),
    dateOverrides: [...dateOverrides.values()].sort((left, right) =>
      left.work_date.localeCompare(right.work_date),
    ),
  };
}
