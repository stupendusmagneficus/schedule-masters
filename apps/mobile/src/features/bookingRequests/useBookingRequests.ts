import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { createWorkspaceRequestGuard } from "../workspace/workspaceRequestGuard";
import {
  listMasterPendingBookingRequests,
  type MasterPendingBookingRequest,
} from "./bookingRequests";

type UseBookingRequestsParams = {
  readonly client: SupabaseClient<Database> | null;
  readonly enabled: boolean;
  readonly workspaceId: string;
};

export function useBookingRequests({
  client,
  enabled,
  workspaceId,
}: UseBookingRequestsParams) {
  const [requests, setRequests] = useState<MasterPendingBookingRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(client && enabled));
  const [requestGuard] = useState(createWorkspaceRequestGuard);

  const reload = useCallback(async () => {
    const requestId = requestGuard.begin();
    if (!client || !enabled) {
      if (requestGuard.isCurrent(requestId)) {
        setRequests([]);
        setError(null);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextRequests = await listMasterPendingBookingRequests(
        client,
        workspaceId,
      );
      if (requestGuard.isCurrent(requestId)) setRequests(nextRequests);
    } catch (loadError) {
      if (requestGuard.isCurrent(requestId)) {
        setError(loadError instanceof Error ? loadError.message : "unknown");
      }
    } finally {
      if (requestGuard.isCurrent(requestId)) setIsLoading(false);
    }
  }, [client, enabled, requestGuard, workspaceId]);

  useEffect(() => {
    void reload();
    const refreshTimer =
      client && enabled ? setInterval(() => void reload(), 60_000) : undefined;
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
      requestGuard.invalidate(requestGuard.begin());
    };
  }, [client, enabled, reload, requestGuard]);

  return { error, isLoading, reload, requests };
}
