import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

import { getMasterCustomerPhone } from "./customerContact";

type UseCustomerPhoneParams = {
  readonly client: SupabaseClient<Database> | null;
  readonly customerId: string | null;
  readonly workspaceId: string;
};

type CustomerPhoneState = {
  readonly customerId: string | null;
  readonly error: boolean;
  readonly isLoading: boolean;
  readonly phone: string | null;
  readonly retryToken: number;
};

export function useCustomerPhone({
  client,
  customerId,
  workspaceId,
}: UseCustomerPhoneParams) {
  const [retryToken, setRetryToken] = useState(0);
  const [state, setState] = useState<CustomerPhoneState>({
    customerId: null,
    error: false,
    isLoading: false,
    phone: null,
    retryToken: 0,
  });

  useEffect(() => {
    let isCurrent = true;
    if (!client || !customerId) {
      setState({
        customerId,
        error: false,
        isLoading: false,
        phone: null,
        retryToken,
      });
      return () => {
        isCurrent = false;
      };
    }

    setState({
      customerId,
      error: false,
      isLoading: true,
      phone: null,
      retryToken,
    });
    void getMasterCustomerPhone(client, workspaceId, customerId)
      .then((phone) => {
        if (isCurrent) {
          setState({
            customerId,
            error: false,
            isLoading: false,
            phone,
            retryToken,
          });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setState({
            customerId,
            error: true,
            isLoading: false,
            phone: null,
            retryToken,
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [client, customerId, retryToken, workspaceId]);

  const retry = useCallback(() => setRetryToken((current) => current + 1), []);
  const matchesSelection =
    state.customerId === customerId && state.retryToken === retryToken;

  return {
    error: matchesSelection && state.error,
    isLoading:
      Boolean(client && customerId) && (!matchesSelection || state.isLoading),
    phone: matchesSelection ? state.phone : null,
    retry,
  };
}
