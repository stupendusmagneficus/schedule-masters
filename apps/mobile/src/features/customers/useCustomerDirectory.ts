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
  readonly workspaceId: string;
  readonly search: string;
};

export function useCustomerDirectory({
  client,
  workspaceId,
  search,
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
    setLoading(true);
    setError(false);
    try {
      setCustomers(await listCustomerDirectory(client, workspaceId, search));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [client, search, workspaceId]);

  useEffect(() => {
    let active = true;
    if (!client) {
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    void listCustomerDirectory(client, workspaceId, search)
      .then((rows) => {
        if (active) setCustomers(rows);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, search, workspaceId]);

  useEffect(() => {
    if (!client || !selectedCustomer) {
      setHistory([]);
      return;
    }
    void reloadHistory();
  }, [client, reloadHistory, selectedCustomer]);

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
