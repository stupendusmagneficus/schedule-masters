import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

import {
  loadMasterWorkspace,
  type WorkspaceLoadResult,
} from "./workspaceLoader";
import { createWorkspaceRequestGuard } from "./workspaceRequestGuard";

export type MasterWorkspaceState =
  | { readonly kind: "idle"; readonly userId: null }
  | { readonly kind: "loading"; readonly userId: string }
  | ({ readonly userId: string } & WorkspaceLoadResult);

type UseMasterWorkspaceParams = {
  readonly client: SupabaseClient<Database> | null;
  readonly userId: string | null;
};

export function useMasterWorkspace({
  client,
  userId,
}: UseMasterWorkspaceParams) {
  const [state, setState] = useState<MasterWorkspaceState>({
    kind: "idle",
    userId: null,
  });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [requestGuard] = useState(createWorkspaceRequestGuard);
  const reload = useCallback(
    () => setReloadVersion((version) => version + 1),
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadVersion intentionally starts a new workspace request.
  useEffect(() => {
    const requestId = requestGuard.begin();

    if (!client || !userId) {
      setState({ kind: "idle", userId: null });
      return () => {
        requestGuard.invalidate(requestId);
      };
    }

    setState({ kind: "loading", userId });
    void loadMasterWorkspace(client, userId)
      .then((result) => {
        if (requestGuard.isCurrent(requestId)) {
          setState({ ...result, userId });
        }
      })
      .catch(() => {
        if (requestGuard.isCurrent(requestId)) {
          setState({ kind: "error", userId });
        }
      });

    return () => {
      requestGuard.invalidate(requestId);
    };
  }, [client, reloadVersion, userId]);

  return { reload, state };
}
