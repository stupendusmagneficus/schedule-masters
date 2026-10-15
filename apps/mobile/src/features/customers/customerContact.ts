import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

type CustomerContactClient = SupabaseClient<Database>;
export type CustomerPhoneAction = "call" | "sms";

export async function getMasterCustomerPhone(
  client: CustomerContactClient,
  workspaceId: string,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await client.rpc("get_master_customer_contact", {
    p_customer_id: customerId,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return data?.[0]?.phone ?? null;
}

export function buildCustomerPhoneUrl(
  phone: string,
  action: CustomerPhoneAction,
): string | null {
  const normalizedPhone = phone.trim().replace(/[^\d+*#]/g, "");
  if (!normalizedPhone || !/[\d]/.test(normalizedPhone)) return null;
  return `${action === "call" ? "tel" : "sms"}:${normalizedPhone}`;
}
