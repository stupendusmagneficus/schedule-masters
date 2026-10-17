import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceAvailabilityRule } from "../../types";
import type { MasterAppointment } from "../appointments/manualBooking";

export type AvailabilityDateOverride = {
  readonly work_date: string;
  readonly override_kind: "closed" | "modified";
  readonly start_local_time: string | null;
  readonly end_local_time: string | null;
};

export type EffectiveAvailability = {
  readonly isClosed: boolean;
  readonly startLocalTime: string | null;
  readonly endLocalTime: string | null;
};

export type AvailabilityOverrideDraft = {
  readonly date: string;
  readonly kind: "closed" | "modified";
  readonly startLocalTime: string | null;
  readonly endLocalTime: string | null;
};

export type AvailabilityDateSelectionSummary = {
  readonly closedDates: string[];
  readonly openDates: string[];
};

export type AvailabilityDateSelectionSnapshot = {
  readonly date: string;
  readonly isClosed: boolean;
  readonly appointments: readonly MasterAppointment[];
};

export function summarizeAvailabilityDateSnapshots(
  snapshots: readonly AvailabilityDateSelectionSnapshot[],
): AvailabilityDateSelectionSummary {
  const summary: AvailabilityDateSelectionSummary = {
    closedDates: [],
    openDates: [],
  };
  for (const snapshot of [...snapshots].sort((left, right) =>
    left.date.localeCompare(right.date),
  )) {
    summary[snapshot.isClosed ? "closedDates" : "openDates"].push(
      snapshot.date,
    );
  }
  return summary;
}

export function classifyAvailabilityDates(
  dates: readonly string[],
  rules: readonly WorkspaceAvailabilityRule[],
  overrides: readonly AvailabilityDateOverride[],
): AvailabilityDateSelectionSummary {
  const summary: AvailabilityDateSelectionSummary = {
    closedDates: [],
    openDates: [],
  };
  for (const date of [...new Set(dates)].sort()) {
    const availability = getEffectiveAvailability(date, rules, overrides);
    summary[availability.isClosed ? "closedDates" : "openDates"].push(date);
  }
  return summary;
}

export function buildAvailabilityOverrideDrafts(
  dates: readonly string[],
  kind: AvailabilityOverrideDraft["kind"],
  startLocalTime: string | null,
  endLocalTime: string | null,
): AvailabilityOverrideDraft[] {
  return [...new Set(dates)].sort().map((date) => ({
    date,
    endLocalTime: kind === "modified" ? endLocalTime : null,
    kind,
    startLocalTime: kind === "modified" ? startLocalTime : null,
  }));
}

export function isValidAvailabilityOverrideDraft(
  draft: AvailabilityOverrideDraft,
): boolean {
  if (draft.kind === "closed") return true;
  if (!draft.startLocalTime || !draft.endLocalTime) return false;
  return (
    parseLocalTime(draft.endLocalTime) > parseLocalTime(draft.startLocalTime)
  );
}

type AvailabilityClient = SupabaseClient<Database>;

export function getEffectiveAvailability(
  date: string,
  rules: readonly WorkspaceAvailabilityRule[],
  overrides: readonly AvailabilityDateOverride[],
): EffectiveAvailability {
  const override = overrides.find((candidate) => candidate.work_date === date);
  if (override?.override_kind === "closed") {
    return { isClosed: true, startLocalTime: null, endLocalTime: null };
  }
  if (override?.override_kind === "modified") {
    return {
      isClosed: false,
      startLocalTime: override.start_local_time,
      endLocalTime: override.end_local_time,
    };
  }
  const dayOfWeek = getIsoDayOfWeek(date);
  const rule = rules.find((candidate) => candidate.dayOfWeek === dayOfWeek);
  return rule
    ? {
        isClosed: false,
        startLocalTime: rule.startLocalTime,
        endLocalTime: rule.endLocalTime,
      }
    : { isClosed: true, startLocalTime: null, endLocalTime: null };
}

export function findAvailabilityConflicts(
  appointments: readonly MasterAppointment[],
  draft: AvailabilityOverrideDraft & { readonly timezone: string },
): MasterAppointment[] {
  return appointments.filter((appointment) => {
    if (
      appointment.status !== "pending" &&
      appointment.status !== "confirmed"
    ) {
      return false;
    }
    const occupiedStart =
      appointment.occupied_starts_at ?? appointment.starts_at;
    const occupiedEnd = appointment.occupied_ends_at ?? appointment.ends_at;
    const dayStart = localDateTimeOrdinal(draft.date, "00:00");
    const dayEnd = dayStart + 1440;
    const occupiedStartOrdinal = instantLocalDateTimeOrdinal(
      occupiedStart,
      draft.timezone,
    );
    const occupiedEndOrdinal = instantLocalDateTimeOrdinal(
      occupiedEnd,
      draft.timezone,
    );
    if (occupiedStartOrdinal >= dayEnd || occupiedEndOrdinal <= dayStart) {
      return false;
    }
    if (draft.kind === "closed") return true;
    const proposedStart = localDateTimeOrdinal(
      draft.date,
      draft.startLocalTime ?? "00:00",
    );
    const proposedEnd = localDateTimeOrdinal(
      draft.date,
      draft.endLocalTime ?? "24:00",
    );
    return (
      occupiedStartOrdinal < proposedStart || occupiedEndOrdinal > proposedEnd
    );
  });
}

export async function listAvailabilityDateOverrides(
  client: AvailabilityClient,
  workspaceId: string,
  fromDate: string,
  toDate: string,
): Promise<AvailabilityDateOverride[]> {
  const { data, error } = await client
    .from("availability_date_overrides")
    .select("work_date, override_kind, start_local_time, end_local_time")
    .eq("workspace_id", workspaceId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) =>
    row.override_kind === "closed" || row.override_kind === "modified"
      ? [{ ...row, override_kind: row.override_kind }]
      : [],
  );
}

export async function saveAvailabilityDateOverride(
  client: AvailabilityClient,
  workspaceId: string,
  draft: AvailabilityOverrideDraft,
): Promise<void> {
  const { error } = await client.rpc("set_master_availability_date_override", {
    p_date: draft.date,
    p_end_local_time:
      draft.kind === "modified" ? (draft.endLocalTime ?? undefined) : undefined,
    p_kind: draft.kind,
    p_start_local_time:
      draft.kind === "modified"
        ? (draft.startLocalTime ?? undefined)
        : undefined,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
}

export async function saveAvailabilityDateOverrides(
  client: AvailabilityClient,
  workspaceId: string,
  drafts: readonly AvailabilityOverrideDraft[],
): Promise<void> {
  if (
    !drafts.length ||
    drafts.some((draft) => !isValidAvailabilityOverrideDraft(draft))
  ) {
    throw new Error("Availability date overrides are invalid");
  }
  const { error } = await client.rpc("set_master_availability_date_overrides", {
    p_overrides: drafts.map((draft) => ({
      date: draft.date,
      endLocalTime: draft.kind === "modified" ? draft.endLocalTime : null,
      kind: draft.kind,
      startLocalTime: draft.kind === "modified" ? draft.startLocalTime : null,
    })),
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
}

export async function clearAvailabilityDateOverride(
  client: AvailabilityClient,
  workspaceId: string,
  date: string,
): Promise<void> {
  const { error } = await client.rpc(
    "clear_master_availability_date_override",
    {
      p_date: date,
      p_workspace_id: workspaceId,
    },
  );
  if (error) throw new Error(error.message);
}

function getIsoDayOfWeek(value: string): number {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  return day || 7;
}

function parseLocalTime(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function localDateTimeOrdinal(date: string, time: string): number {
  const day = Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 60_000);
  return day + parseLocalTime(time);
}

function instantLocalDateTimeOrdinal(value: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "00";
  const date = `${part("year")}-${part("month")}-${part("day")}`;
  return localDateTimeOrdinal(date, `${part("hour")}:${part("minute")}`);
}
