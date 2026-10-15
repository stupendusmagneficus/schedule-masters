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
  const [requestGuard] = useState(createWorkspaceRequestGuard);

  const reload = useCallback(async () => {
    const requestId = requestGuard.begin();
    if (!client || !enabled) {
      if (requestGuard.isCurrent(requestId)) {
        setEntries([]);
        setError(null);
        setIsLoading(false);
      }
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const nextEntries = await listMasterWaitingList(client, workspaceId);
      if (requestGuard.isCurrent(requestId)) setEntries(nextEntries);
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

  return { entries, error, isLoading, reload };
}
