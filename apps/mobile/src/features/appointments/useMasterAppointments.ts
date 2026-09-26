import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { formatDateInTimeZone } from "../availability/personalBlocks";
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
      const fromDate = formatDateInTimeZone(new Date(), timezone);
      const toDate = addDays(fromDate, 7);
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

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
