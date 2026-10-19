import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WeeklyAvailabilityDraft = {
  readonly dayOfWeek: number;
  readonly kind: "closed" | "modified";
  readonly startLocalTime: string | null;
  readonly endLocalTime: string | null;
};

export function getIsoWeekdaysForDates(dates: readonly string[]): number[] {
  return [...new Set(dates)]
    .map((date) => {
      const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
      return weekday === 0 ? 7 : weekday;
    })
    .sort((left, right) => left - right);
}

export function buildWeeklyAvailabilityDrafts(
  weekdays: readonly number[],
  kind: WeeklyAvailabilityDraft["kind"],
  startLocalTime: string | null,
  endLocalTime: string | null,
): WeeklyAvailabilityDraft[] {
  return [...new Set(weekdays)]
    .sort((left, right) => left - right)
    .map((dayOfWeek) => ({
      dayOfWeek,
      endLocalTime: kind === "modified" ? endLocalTime : null,
      kind,
      startLocalTime: kind === "modified" ? startLocalTime : null,
    }));
}

export function isValidWeeklyAvailabilityDraft(
  draft: WeeklyAvailabilityDraft,
): boolean {
  if (
    !Number.isInteger(draft.dayOfWeek) ||
    draft.dayOfWeek < 1 ||
    draft.dayOfWeek > 7
  )
    return false;
  if (draft.kind === "closed") return true;
  if (!draft.startLocalTime || !draft.endLocalTime) return false;
  const start = parseTime(draft.startLocalTime);
  const end = parseTime(draft.endLocalTime);
  return start !== null && end !== null && end > start;
}

type WeeklyAvailabilityClient = SupabaseClient<Database>;

export async function saveWeeklyAvailability(
  client: WeeklyAvailabilityClient,
  workspaceId: string,
  drafts: readonly WeeklyAvailabilityDraft[],
): Promise<void> {
  if (
    !drafts.length ||
    drafts.some((draft) => !isValidWeeklyAvailabilityDraft(draft))
  ) {
    throw new Error("Weekly availability rules are invalid");
  }
  const { error } = await client.rpc("set_master_weekly_availability", {
    p_rules: drafts.map((draft) => ({
      dayOfWeek: draft.dayOfWeek,
      endLocalTime: draft.kind === "modified" ? draft.endLocalTime : null,
      kind: draft.kind,
      startLocalTime: draft.kind === "modified" ? draft.startLocalTime : null,
    })),
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
}

function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}
