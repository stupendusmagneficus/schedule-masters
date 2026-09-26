import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { addCalendarDays, getTodayCalendarDate } from "../calendar/calendar";
import {
  listMasterAppointments,
  type MasterAppointment,
} from "./manualBooking";

type UseMasterAppointmentsProps = {
  readonly client: SupabaseClient<Database> | null;
  readonly timezone: string;
  readonly workspaceId: string;
};

export function useMasterAppointments({
  client,
  timezone,
  workspaceId,
}: UseMasterAppointmentsProps) {
  const [appointments, setAppointments] = useState<MasterAppointment[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setLoading] = useState(Boolean(client));

  const reload = useCallback(async () => {
    if (!client) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fromDate = getTodayCalendarDate(timezone);
      const toDate = addCalendarDays(fromDate, 7);
      setAppointments(
        await listMasterAppointments(client, workspaceId, fromDate, toDate),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError : new Error("Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  }, [client, timezone, workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { appointments, error, isLoading, reload };
}
