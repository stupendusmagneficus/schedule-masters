import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

type CustomerContactClient = SupabaseClient<Database>;
export type CustomerPhoneAction = "call" | "sms";

export function buildCustomerEmailUrl(email: string): string | null {
  const normalizedEmail = email.trim();
  if (
    !normalizedEmail ||
    /[\s<>?#&]/.test(normalizedEmail) ||
    !/^[^@]+@[^@]+\.[^@]+$/.test(normalizedEmail)
  ) {
    return null;
  }
  return `mailto:${normalizedEmail}`;
}

export async function getMasterCustomerPhone(
  client: CustomerContactClient,
  workspaceId: string,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("customers")
    .select("phone")
    .eq("workspace_id", workspaceId)
    .eq("id", customerId)
    .is("anonymized_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.phone ?? null;
}

export function buildCustomerPhoneUrl(
  phone: string,
  action: CustomerPhoneAction,
): string | null {
  const normalizedPhone = phone.trim().replace(/[^\d+*#]/g, "");
  if (!normalizedPhone || !/[\d]/.test(normalizedPhone)) return null;
  return `${action === "call" ? "tel" : "sms"}:${normalizedPhone}`;
}
