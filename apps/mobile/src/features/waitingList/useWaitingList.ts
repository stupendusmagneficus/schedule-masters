import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { createWorkspaceRequestGuard } from "../workspace/workspaceRequestGuard";
import {
  listMasterWaitingList,
  type MasterWaitingListEntry,
} from "./waitingList";

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
      }
      return;
    }
    if (!hasCurrentWorkspaceData) setIsLoading(true);
    setError(null);
    try {
      const nextEntries = await listMasterWaitingList(client, workspaceId);
      if (requestGuard.isCurrent(requestId)) {
        setEntries(nextEntries);
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

  useEffect(() => {
    if (enabled && !hasCurrentWorkspaceData) void reload();
  }, [enabled, hasCurrentWorkspaceData, reload]);

  useEffect(
    () => () => {
      requestGuard.invalidate(requestGuard.begin());
    },
    [requestGuard],
  );

  return {
    entries: hasCurrentWorkspaceData ? entries : [],
    error: hasCurrentWorkspaceData ? error : null,
    isLoading: isLoading && !hasCurrentWorkspaceData,
    reload,
  };
}
