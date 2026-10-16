import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PersonalBlockDraft = {
  readonly date: string;
  readonly endTime: string;
  readonly reason: string;
  readonly startTime: string;
};

export type PersonalBlockValidationError = "date" | "endBeforeStart" | "time";

export type PersonalBlock =
  Database["public"]["Functions"]["list_master_availability_blocks"]["Returns"][number];

type PersonalBlockClient = SupabaseClient<Database>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validatePersonalBlockDraft(
  draft: PersonalBlockDraft,
): PersonalBlockValidationError | null {
  if (!isValidDate(draft.date)) return "date";
  if (!timePattern.test(draft.startTime) || !timePattern.test(draft.endTime)) {
    return "time";
  }
  if (timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime)) {
    return "endBeforeStart";
  }
  return null;
}

export function createDefaultPersonalBlockDraft(
  date: string,
): PersonalBlockDraft {
  return { date, endTime: "13:00", reason: "", startTime: "12:00" };
}

export async function listPersonalBlocks(
  client: PersonalBlockClient,
  workspaceId: string,
  timezone: string,
  now = new Date(),
): Promise<PersonalBlock[]> {
  const fromDate = formatDateInTimeZone(now, timezone);
  const toDate = addDays(fromDate, 7);
  return listPersonalBlocksInRange(client, workspaceId, fromDate, toDate);
}

export async function listPersonalBlocksInRange(
  client: PersonalBlockClient,
  workspaceId: string,
  fromDate: string,
  toDate: string,
): Promise<PersonalBlock[]> {
  const { data, error } = await client.rpc("list_master_availability_blocks", {
    p_from_date: fromDate,
    p_to_date: toDate,
    p_workspace_id: workspaceId,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPersonalBlock(
  client: PersonalBlockClient,
  workspaceId: string,
  draft: PersonalBlockDraft,
): Promise<void> {
  const { error } = await client.rpc("create_master_availability_block", {
    p_date: draft.date,
    p_end_local_time: draft.endTime,
    p_reason: draft.reason.trim() || undefined,
    p_start_local_time: draft.startTime,
    p_workspace_id: workspaceId,
  });

  if (error) throw new Error(error.message);
}

export async function updatePersonalBlock(
  client: PersonalBlockClient,
  workspaceId: string,
  blockId: string,
  draft: PersonalBlockDraft,
): Promise<void> {
  const { error } = await client.rpc("update_master_availability_block", {
    p_block_id: blockId,
    p_date: draft.date,
    p_end_local_time: draft.endTime,
    p_reason: draft.reason.trim() || undefined,
    p_start_local_time: draft.startTime,
    p_workspace_id: workspaceId,
  });

  if (error) throw new Error(error.message);
}

export async function deletePersonalBlock(
  client: PersonalBlockClient,
  workspaceId: string,
  blockId: string,
): Promise<void> {
  const { error } = await client.rpc("delete_master_availability_block", {
    p_block_id: blockId,
    p_workspace_id: workspaceId,
  });

  if (error) throw new Error(error.message);
}

export function formatDateInTimeZone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function formatTimeInTimeZone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export function getPersonalBlockDraft(
  block: PersonalBlock,
  timezone: string,
): PersonalBlockDraft {
  return {
    date: formatDateInTimeZone(new Date(block.starts_at), timezone),
    endTime: formatTimeInTimeZone(new Date(block.ends_at), timezone),
    reason: block.reason ?? "",
    startTime: formatTimeInTimeZone(new Date(block.starts_at), timezone),
  };
}

export function getPersonalBlockDraftForSlot(
  startsAt: string,
  timezone: string,
  durationMinutes = 30,
): PersonalBlockDraft {
  const startsAtDate = new Date(startsAt);
  const date = formatDateInTimeZone(startsAtDate, timezone);
  const startTime = formatTimeInTimeZone(startsAtDate, timezone);
  const [hour, minute] = startTime.split(":").map(Number);
  const endMinuteOfDay = Math.min(hour * 60 + minute + durationMinutes, 1439);
  const endTime = `${String(Math.floor(endMinuteOfDay / 60)).padStart(2, "0")}:${String(endMinuteOfDay % 60).padStart(2, "0")}`;

  return { date, endTime, reason: "", startTime };
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isValidDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
