import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Service } from "../../types";
import {
  archiveService,
  createService,
  listServices,
  restoreService,
  type ServiceDraft,
  updateService,
} from "./serviceCatalog";

type ServiceClient = SupabaseClient<Database> | null;

export type ServiceCatalogController = ReturnType<typeof useServiceCatalog>;

export function useServiceCatalog({
  client,
  initialServices = [],
  workspaceId,
}: {
  readonly client: ServiceClient;
  readonly initialServices?: readonly Service[];
  readonly workspaceId: string;
}) {
  const [services, setServices] = useState<Service[]>([...initialServices]);
  const [isLoading, setLoading] = useState(Boolean(client));
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!client) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setServices(await listServices(client, workspaceId));
    } catch (nextError) {
      setError(toError(nextError));
    } finally {
      setLoading(false);
    }
  }, [client, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = useCallback(
    async (operation: () => Promise<Service> | Promise<void>) => {
      setSaving(true);
      setError(null);
      try {
        await operation();
        await load();
      } catch (nextError) {
        const normalizedError = toError(nextError);
        setError(normalizedError);
        throw normalizedError;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const create = useCallback(
    (draft: ServiceDraft) => {
      if (!client)
        return Promise.reject(new Error("Supabase is not configured"));
      return mutate(() => createService(client, workspaceId, draft));
    },
    [client, mutate, workspaceId],
  );

  const update = useCallback(
    (serviceId: string, draft: ServiceDraft) => {
      if (!client)
        return Promise.reject(new Error("Supabase is not configured"));
      return mutate(() => updateService(client, workspaceId, serviceId, draft));
    },
    [client, mutate, workspaceId],
  );

  const archive = useCallback(
    (serviceId: string) => {
      if (!client)
        return Promise.reject(new Error("Supabase is not configured"));
      return mutate(() => archiveService(client, workspaceId, serviceId));
    },
    [client, mutate, workspaceId],
  );

  const restore = useCallback(
    (serviceId: string) => {
      if (!client)
        return Promise.reject(new Error("Supabase is not configured"));
      return mutate(() => restoreService(client, workspaceId, serviceId));
    },
    [client, mutate, workspaceId],
  );

  const activeServices = useMemo(
    () =>
      services.filter((service) => service.is_active && !service.archived_at),
    [services],
  );

  return {
    activeServices,
    archive,
    create,
    error,
    isLoading,
    isSaving,
    load,
    restore,
    services,
    update,
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Service request failed");
}
