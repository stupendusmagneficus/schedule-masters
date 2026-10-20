import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CustomerProfile,
  type CustomerVisit,
  listCustomerDirectory,
  listCustomerHistory,
} from "./customerDirectory";

type UseCustomerDirectoryProps = {
  readonly client: SupabaseClient<Database> | null;
  readonly directoryRefreshVersion: number;
  readonly workspaceId: string;
  readonly search: string;
  readonly historyRefreshVersion: number;
};

export function useCustomerDirectory({
  client,
  directoryRefreshVersion,
  workspaceId,
  search,
  historyRefreshVersion,
}: UseCustomerDirectoryProps) {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [isLoading, setLoading] = useState(Boolean(client));
  const [error, setError] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerProfile | null>(null);
  const [history, setHistory] = useState<CustomerVisit[]>([]);
  const [isHistoryLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const historyRequest = useRef(0);
  const directoryRequest = useRef(0);
  const hasLoaded = useRef(false);
  const loadedSearch = useRef<string | null>(null);
  const loadedWorkspace = useRef(workspaceId);
  const loadedClient = useRef(client);
  const previousHistoryRefreshVersion = useRef(historyRefreshVersion);
  const previousDirectoryRefreshVersion = useRef(directoryRefreshVersion);

  const reloadHistory = useCallback(async () => {
    if (!client || !selectedCustomer) {
      historyRequest.current += 1;
      setHistory([]);
      return;
    }
    const request = ++historyRequest.current;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const rows = await listCustomerHistory(
        client,
        workspaceId,
        selectedCustomer.id,
      );
      if (historyRequest.current === request) setHistory(rows);
    } catch {
      if (historyRequest.current === request) setHistoryError(true);
    } finally {
      if (historyRequest.current === request) setHistoryLoading(false);
    }
  }, [client, selectedCustomer, workspaceId]);

  const reload = useCallback(async () => {
    if (!client) {
      setCustomers([]);
      setLoading(false);
      return;
    }
    const request = ++directoryRequest.current;
    hasLoaded.current = true;
    setLoading(true);
    setError(false);
    try {
      const rows = await listCustomerDirectory(client, workspaceId, search);
      if (directoryRequest.current === request) {
        setCustomers(rows);
        loadedSearch.current = search;
      }
    } catch {
      if (directoryRequest.current === request) setError(true);
    } finally {
      if (directoryRequest.current === request) setLoading(false);
    }
  }, [client, search, workspaceId]);

  useEffect(() => {
    if (
      loadedWorkspace.current !== workspaceId ||
      loadedClient.current !== client
    ) {
      loadedWorkspace.current = workspaceId;
      loadedClient.current = client;
      directoryRequest.current += 1;
      hasLoaded.current = false;
      loadedSearch.current = null;
      setCustomers([]);
    }
    if (!client) {
      directoryRequest.current += 1;
      setCustomers([]);
      setLoading(false);
      hasLoaded.current = false;
      loadedSearch.current = null;
      return;
    }
    if (!hasLoaded.current) {
      void reload();
      return;
    }
    if (loadedSearch.current === search) return;

    const timeout = setTimeout(() => void reload(), 250);
    return () => clearTimeout(timeout);
  }, [client, reload, search, workspaceId]);

  useEffect(() => {
    if (!client || !selectedCustomer) {
      setHistory([]);
      return;
    }
    void reloadHistory();
  }, [client, reloadHistory, selectedCustomer]);

  useEffect(() => {
    if (previousDirectoryRefreshVersion.current === directoryRefreshVersion)
      return;
    previousDirectoryRefreshVersion.current = directoryRefreshVersion;
    void reload();
  }, [directoryRefreshVersion, reload]);

  useEffect(() => {
    if (previousHistoryRefreshVersion.current === historyRefreshVersion) return;
    previousHistoryRefreshVersion.current = historyRefreshVersion;
    if (selectedCustomer) void reloadHistory();
  }, [historyRefreshVersion, reloadHistory, selectedCustomer]);

  return {
    customers,
    error,
    history,
    historyError,
    isHistoryLoading,
    isLoading,
    reload,
    reloadHistory,
    selectedCustomer,
    selectCustomer: setSelectedCustomer,
  };
}
