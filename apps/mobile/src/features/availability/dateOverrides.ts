import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceAvailabilityRule } from "../../types";
import type { MasterAppointment } from "../appointments/manualBooking";
import { formatDateInTimeZone } from "./personalBlocks";

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
    const startDate = formatDateInTimeZone(
      new Date(appointment.starts_at),
      draft.timezone,
    );
    const endDate = formatDateInTimeZone(
      new Date(appointment.ends_at),
      draft.timezone,
    );
    if (startDate !== draft.date && endDate !== draft.date) return false;
    if (draft.kind === "closed") return true;
    const proposedStart = parseLocalTime(draft.startLocalTime ?? "00:00");
    const proposedEnd = parseLocalTime(draft.endLocalTime ?? "24:00");
    return (
      (startDate === draft.date &&
        parseAppointmentTime(appointment.starts_at, draft.timezone) <
          proposedStart) ||
      (endDate === draft.date &&
        parseAppointmentTime(appointment.ends_at, draft.timezone) > proposedEnd)
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

function parseAppointmentTime(value: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: timezone,
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
}
