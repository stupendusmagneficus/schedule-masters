import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { createWorkspaceRequestGuard } from "../workspace/workspaceRequestGuard";
import {
  createPersonalBlock,
  deletePersonalBlock,
  listPersonalBlocks,
  type PersonalBlock,
  type PersonalBlockDraft,
} from "./personalBlocks";

type UsePersonalBlocksParams = {
  readonly client: SupabaseClient<Database> | null;
  readonly timezone: string;
  readonly workspaceId: string;
};

export function usePersonalBlocks({
  client,
  timezone,
  workspaceId,
}: UsePersonalBlocksParams) {
  const [blocks, setBlocks] = useState<PersonalBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(client));
  const [isSaving, setIsSaving] = useState(false);
  const [requestGuard] = useState(createWorkspaceRequestGuard);
  const [operationGuard] = useState(createWorkspaceRequestGuard);

  const reload = useCallback(async () => {
    const requestId = requestGuard.begin();

    if (!client) {
      if (requestGuard.isCurrent(requestId)) {
        setBlocks([]);
        setIsLoading(false);
      }
      return;
    }

    if (requestGuard.isCurrent(requestId)) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const nextBlocks = await listPersonalBlocks(
        client,
        workspaceId,
        timezone,
      );
      if (requestGuard.isCurrent(requestId)) setBlocks(nextBlocks);
    } catch (loadError) {
      if (requestGuard.isCurrent(requestId)) {
        setError(loadError instanceof Error ? loadError.message : "unknown");
      }
    } finally {
      if (requestGuard.isCurrent(requestId)) setIsLoading(false);
    }
  }, [client, requestGuard, timezone, workspaceId]);

  useEffect(() => {
    void reload();
    return () => {
      requestGuard.invalidate(requestGuard.begin());
      operationGuard.invalidate(operationGuard.begin());
    };
  }, [operationGuard, reload, requestGuard]);

  const save = useCallback(
    async (draft: PersonalBlockDraft) => {
      if (!client) return;
      const requestId = operationGuard.begin();
      setIsSaving(true);
      setError(null);
      try {
        await createPersonalBlock(client, workspaceId, draft);
        await reload();
      } catch (saveError) {
        const message =
          saveError instanceof Error ? saveError.message : "unknown";
        if (operationGuard.isCurrent(requestId)) setError(message);
        throw saveError;
      } finally {
        if (operationGuard.isCurrent(requestId)) setIsSaving(false);
      }
    },
    [client, operationGuard, reload, workspaceId],
  );

  const remove = useCallback(
    async (blockId: string) => {
      if (!client) return;
      const requestId = operationGuard.begin();
      setIsSaving(true);
      setError(null);
      try {
        await deletePersonalBlock(client, workspaceId, blockId);
        await reload();
      } catch (deleteError) {
        const message =
          deleteError instanceof Error ? deleteError.message : "unknown";
        if (operationGuard.isCurrent(requestId)) setError(message);
        throw deleteError;
      } finally {
        if (operationGuard.isCurrent(requestId)) setIsSaving(false);
      }
    },
    [client, operationGuard, reload, workspaceId],
  );

  return { blocks, error, isLoading, isSaving, reload, remove, save };
}
