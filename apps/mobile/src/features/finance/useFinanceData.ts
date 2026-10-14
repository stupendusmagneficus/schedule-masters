import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DemoData } from "../../demo/types";
import {
  listMasterAppointments,
  type MasterAppointment,
} from "../appointments/manualBooking";
import { formatDateInTimeZone } from "../availability/personalBlocks";
import { getCalendarDateRange } from "../calendar/calendar";
import {
  getDayTimelineSlotStart,
  timeToMinutes,
} from "../calendar/dayTimeline";

type UseFinanceDataParams = {
  readonly client: SupabaseClient<Database> | null;
  readonly demoData?: DemoData;
  readonly month: string;
  readonly timezone: string;
  readonly workspaceId: string;
};

export function useFinanceData({
  client,
  demoData,
  month,
  timezone,
  workspaceId,
}: UseFinanceDataParams) {
  const [appointments, setAppointments] = useState<MasterAppointment[]>([]);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(client));
  const requestId = useRef(0);
  const range = getCalendarDateRange(month, "month");

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setError(false);

    if (demoData) {
      const currentMonth = formatDateInTimeZone(new Date(), timezone).slice(
        0,
        7,
      );
      if (month.slice(0, 7) < currentMonth) {
        setAppointments([]);
        setIsLoading(false);
        return;
      }

      setAppointments(
        demoData.appointments.map((appointment, index) => {
          const date = `${month.slice(0, 7)}-${String(index + 2).padStart(2, "0")}`;
          const startsAt =
            month.slice(0, 7) === currentMonth
              ? new Date(Date.now() + (index + 1) * 60 * 60_000).toISOString()
              : getDayTimelineSlotStart(
                  date,
                  timeToMinutes(appointment.startsAt),
                  timezone,
                );
          return {
            currency: demoData.primaryService.currency,
            customer_id: appointment.id,
            customer_name: appointment.clientName,
            duration_minutes: appointment.durationMinutes,
            ends_at: new Date(
              new Date(startsAt).getTime() +
                appointment.durationMinutes * 60_000,
            ).toISOString(),
            id: appointment.id,
            is_new_customer: false,
            is_returning_customer: false,
            paid_amount: 0,
            price_amount: appointment.priceAmount,
            service_name: appointment.serviceName,
            source: "master_created",
            starts_at: startsAt,
            status: appointment.status,
          };
        }),
      );
      setIsLoading(false);
      return;
    }

    if (!client) {
      setAppointments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await listMasterAppointments(
        client,
        workspaceId,
        range.fromDate,
        range.toDate,
      );
      if (requestId.current === currentRequestId) setAppointments(result);
    } catch {
      if (requestId.current === currentRequestId) setError(true);
    } finally {
      if (requestId.current === currentRequestId) setIsLoading(false);
    }
  }, [
    client,
    demoData,
    month,
    range.fromDate,
    range.toDate,
    timezone,
    workspaceId,
  ]);

  useEffect(() => {
    void reload();
    return () => {
      requestId.current += 1;
    };
  }, [reload]);

  return { appointments, error, isLoading, reload };
}
