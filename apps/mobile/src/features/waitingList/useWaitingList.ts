import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { createWorkspaceRequestGuard } from "../workspace/workspaceRequestGuard";
import {
  loadMasterWaitingListOnce,
  type MasterWaitingListEntry,
} from "./waitingList";
import {
  shouldLoadWaitingList,
  shouldRefreshWaitingListOnResume,
} from "./waitingListCache";

export function useWaitingList({
  client,
  enabled,
  workspaceId,
}: {
  readonly client: SupabaseClient<Database> | null;
  readonly enabled: boolean;
  readonly workspaceId: string;
}) {
  const [entries, setEntries] = useState<MasterWaitingListEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(client && enabled));
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(
    null,
  );
  const [failedWorkspaceId, setFailedWorkspaceId] = useState<string | null>(
    null,
  );
  const [requestGuard] = useState(createWorkspaceRequestGuard);
  const hasCurrentWorkspaceData = loadedWorkspaceId === workspaceId;

  const reload = useCallback(async () => {
    const requestId = requestGuard.begin();
    if (!client) {
      if (requestGuard.isCurrent(requestId)) {
        setEntries([]);
        setError(null);
        setIsLoading(false);
        setLoadedWorkspaceId(null);
        setFailedWorkspaceId(null);
      }
      return;
    }
    if (!hasCurrentWorkspaceData) setIsLoading(true);
    setError(null);
    setFailedWorkspaceId(null);
    try {
      const nextEntries = await loadMasterWaitingListOnce(client, workspaceId);
      if (requestGuard.isCurrent(requestId)) {
        setEntries(nextEntries);
        setLoadedWorkspaceId(workspaceId);
        setFailedWorkspaceId(null);
      }
    } catch (loadError) {
      if (requestGuard.isCurrent(requestId)) {
        setError(loadError instanceof Error ? loadError.message : "unknown");
        setFailedWorkspaceId(workspaceId);
      }
    } finally {
      if (requestGuard.isCurrent(requestId)) setIsLoading(false);
    }
  }, [client, hasCurrentWorkspaceData, requestGuard, workspaceId]);
  const reloadRef = useRef(reload);

  useEffect(() => {
    if (shouldLoadWaitingList({ enabled, hasCurrentWorkspaceData })) {
      void reload();
    }
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
      if (
        shouldRefreshWaitingListOnResume({
          enabled,
          hasCurrentWorkspaceData,
          resumed,
        })
      ) {
        void reloadRef.current();
      }
    });
    return () => subscription.remove();
  }, [client, enabled, hasCurrentWorkspaceData]);

  useEffect(
    () => () => {
      requestGuard.invalidate(requestGuard.begin());
    },
    [requestGuard],
  );

  return {
    entries: hasCurrentWorkspaceData ? entries : [],
    error:
      hasCurrentWorkspaceData || failedWorkspaceId === workspaceId
        ? error
        : null,
    hasData: hasCurrentWorkspaceData,
    isLoading:
      !hasCurrentWorkspaceData &&
      (isLoading ||
        (enabled && Boolean(client) && failedWorkspaceId !== workspaceId)),
    reload,
  };
}
