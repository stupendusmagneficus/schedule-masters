import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DemoData } from "../../demo/types";
import {
  listMasterAppointments,
  type MasterAppointment,
} from "../appointments/manualBooking";
import { formatDateInTimeZone } from "../availability/personalBlocks";
import {
  getDayTimelineSlotStart,
  timeToMinutes,
} from "../calendar/dayTimeline";

type UseFinanceDataParams = {
  readonly client: SupabaseClient<Database> | null;
  readonly demoData?: DemoData;
  readonly enabled: boolean;
  readonly fromDate: string;
  readonly refreshVersion: number;
  readonly toDate: string;
  readonly timezone: string;
  readonly workspaceId: string;
};

export function shouldLoadFinanceData({
  enabled,
  hasCurrentData,
  loadedRefreshVersion,
  refreshVersion,
}: {
  readonly enabled: boolean;
  readonly hasCurrentData: boolean;
  readonly loadedRefreshVersion: number;
  readonly refreshVersion: number;
}) {
  return (
    enabled && (!hasCurrentData || loadedRefreshVersion !== refreshVersion)
  );
}

export function useFinanceData({
  client,
  demoData,
  enabled,
  fromDate,
  refreshVersion,
  toDate,
  timezone,
  workspaceId,
}: UseFinanceDataParams) {
  const [appointments, setAppointments] = useState<MasterAppointment[]>([]);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(client));
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadedRefreshVersion, setLoadedRefreshVersion] = useState(-1);
  const requestId = useRef(0);
  const queryKey = `${workspaceId}:${fromDate}:${toDate}`;
  const hasCurrentData = loadedKey === queryKey;

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setError(false);

    if (demoData) {
      const today = formatDateInTimeZone(new Date(), timezone);
      if (toDate < today && toDate.slice(0, 7) < today.slice(0, 7)) {
        setAppointments([]);
        setLoadedKey(queryKey);
        setLoadedRefreshVersion(refreshVersion);
        setIsLoading(false);
        return;
      }

      setAppointments(
        demoData.appointments.map((appointment, index) => {
          const date = addDateWithinRange(fromDate, toDate, index + 1);
          const startsAt =
            date === today
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
      setLoadedKey(queryKey);
      setLoadedRefreshVersion(refreshVersion);
      setIsLoading(false);
      return;
    }

    if (!client) {
      setAppointments([]);
      setLoadedKey(null);
      setLoadedRefreshVersion(refreshVersion);
      setIsLoading(false);
      return;
    }

    if (!hasCurrentData) setIsLoading(true);
    try {
      const result = await listMasterAppointments(
        client,
        workspaceId,
        fromDate,
        toDate,
      );
      if (requestId.current === currentRequestId) {
        setAppointments(result);
        setLoadedKey(queryKey);
      }
    } catch {
      if (requestId.current === currentRequestId) {
        setError(true);
        setLoadedKey(queryKey);
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setLoadedRefreshVersion(refreshVersion);
        setIsLoading(false);
      }
    }
  }, [
    client,
    demoData,
    hasCurrentData,
    fromDate,
    queryKey,
    refreshVersion,
    toDate,
    timezone,
    workspaceId,
  ]);

  useEffect(() => {
    if (!client && !demoData) return;
    if (
      !shouldLoadFinanceData({
        enabled,
        hasCurrentData,
        loadedRefreshVersion,
        refreshVersion,
      })
    ) {
      return;
    }
    void reload();
    return () => {
      requestId.current += 1;
    };
  }, [
    client,
    demoData,
    enabled,
    hasCurrentData,
    loadedRefreshVersion,
    refreshVersion,
    reload,
  ]);

  return {
    appointments: hasCurrentData ? appointments : [],
    error: hasCurrentData ? error : false,
    isLoading:
      !hasCurrentData &&
      (isLoading || (enabled && Boolean(client || demoData))),
    reload,
  };
}

function addDateWithinRange(fromDate: string, toDate: string, offset: number) {
  const from = new Date(`${fromDate}T12:00:00.000Z`);
  const to = new Date(`${toDate}T12:00:00.000Z`);
  const days = Math.max(
    1,
    Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1,
  );
  from.setUTCDate(from.getUTCDate() + (offset % days));
  return from.toISOString().slice(0, 10);
}
