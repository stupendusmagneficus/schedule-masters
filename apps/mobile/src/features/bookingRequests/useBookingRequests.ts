import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
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
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(
    null,
  );
  const [requestGuard] = useState(createWorkspaceRequestGuard);
  const hasCurrentWorkspaceData = loadedWorkspaceId === workspaceId;

  const reload = useCallback(async () => {
    const requestId = requestGuard.begin();
    if (!client) {
      if (requestGuard.isCurrent(requestId)) {
        setRequests([]);
        setError(null);
        setIsLoading(false);
        setLoadedWorkspaceId(null);
      }
      return;
    }

    if (!hasCurrentWorkspaceData) setIsLoading(true);
    setError(null);
    try {
      const nextRequests = await listMasterPendingBookingRequests(
        client,
        workspaceId,
      );
      if (requestGuard.isCurrent(requestId)) {
        setRequests(nextRequests);
        setLoadedWorkspaceId(workspaceId);
      }
    } catch (loadError) {
      if (requestGuard.isCurrent(requestId)) {
        setError(loadError instanceof Error ? loadError.message : "unknown");
      }
    } finally {
      if (requestGuard.isCurrent(requestId)) setIsLoading(false);
    }
  }, [client, hasCurrentWorkspaceData, requestGuard, workspaceId]);
  const reloadRef = useRef(reload);

  useEffect(() => {
    if (enabled && !hasCurrentWorkspaceData) void reload();
  }, [enabled, hasCurrentWorkspaceData, reload]);

  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    if (!client) return;
    let wasActive = AppState.currentState === "active";
    const subscription = AppState.addEventListener("change", (nextState) => {
      const resumed = nextState === "active" && !wasActive;
      wasActive = nextState === "active";
      if (resumed) void reloadRef.current();
    });
    return () => subscription.remove();
  }, [client]);

  useEffect(
    () => () => {
      requestGuard.invalidate(requestGuard.begin());
    },
    [requestGuard],
  );

  return {
    error: hasCurrentWorkspaceData ? error : null,
    isLoading: isLoading && !hasCurrentWorkspaceData,
    reload,
    requests: hasCurrentWorkspaceData ? requests : [],
  };
}
