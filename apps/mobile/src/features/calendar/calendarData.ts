import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  listMasterAppointments,
  type MasterAppointment,
} from "../appointments/manualBooking";
import {
  listPersonalBlocksInRange,
  type PersonalBlock,
} from "../availability/personalBlocks";
import type { CalendarDateRange } from "./calendar";

export type CalendarData = {
  readonly appointments: MasterAppointment[];
  readonly blocks: PersonalBlock[];
};

export async function listCalendarData(
  client: SupabaseClient<Database>,
  workspaceId: string,
  range: CalendarDateRange,
): Promise<CalendarData> {
  const [appointments, blocks] = await Promise.all([
    listMasterAppointments(client, workspaceId, range.fromDate, range.toDate),
    listPersonalBlocksInRange(
      client,
      workspaceId,
      range.fromDate,
      range.toDate,
    ),
  ]);

  return { appointments, blocks };
}
