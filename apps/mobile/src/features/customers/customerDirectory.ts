import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { collectCustomerPages } from "./customerPagination";

export type CustomerProfile =
  Database["public"]["Functions"]["list_master_customer_directory"]["Returns"][number];
export type CustomerVisit =
  Database["public"]["Functions"]["list_master_customer_history"]["Returns"][number];

type CustomerDirectoryClient = SupabaseClient<Database>;

export async function getCustomerProfile(
  client: CustomerDirectoryClient,
  workspaceId: string,
  customerId: string,
): Promise<CustomerProfile | null> {
  const { data, error } = await client.rpc("get_master_customer_profile", {
    p_workspace_id: workspaceId,
    p_customer_id: customerId,
  });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function anonymizeCustomer(
  client: CustomerDirectoryClient,
  workspaceId: string,
  customerId: string,
): Promise<void> {
  const { error } = await client.rpc("anonymize_master_customer", {
    p_customer_id: customerId,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
}

export async function listCustomerDirectory(
  client: CustomerDirectoryClient,
  workspaceId: string,
  search: string,
): Promise<CustomerProfile[]> {
  return collectCustomerPages((from, to) =>
    client
      .rpc("list_master_customer_directory", {
        p_search: search.trim() || undefined,
        p_workspace_id: workspaceId,
      })
      .range(from, to),
  );
}

export async function listCustomerHistory(
  client: CustomerDirectoryClient,
  workspaceId: string,
  customerId: string,
): Promise<CustomerVisit[]> {
  const { data, error } = await client.rpc("list_master_customer_history", {
    p_customer_id: customerId,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}
