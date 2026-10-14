import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

type NotificationClient = SupabaseClient<Database>;

export type CustomerAppointmentLink = {
  readonly expiresAt: string;
  readonly token: string;
};

export async function createCustomerAppointmentLink(
  client: NotificationClient,
  appointmentId: string,
  customerConsentConfirmed: boolean,
): Promise<CustomerAppointmentLink> {
  if (!customerConsentConfirmed) {
    throw new Error("Customer notification consent is required");
  }
  const { data, error } = await client.rpc("create_customer_appointment_link", {
    p_appointment_id: appointmentId,
    p_customer_consent_confirmed: customerConsentConfirmed,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Appointment link response is invalid");
  }

  const result = data as { expiresAt?: unknown; token?: unknown };
  if (
    typeof result.token !== "string" ||
    !/^[0-9a-f]{128}$/.test(result.token) ||
    typeof result.expiresAt !== "string"
  ) {
    throw new Error("Appointment link response is invalid");
  }

  return { expiresAt: result.expiresAt, token: result.token };
}

export async function recordCustomerLinkShare(
  client: NotificationClient,
  appointmentId: string,
  status: "share_sheet_opened" | "share_sheet_failed",
): Promise<void> {
  const { error } = await client.rpc("record_customer_link_share", {
    p_appointment_id: appointmentId,
    p_error_code:
      status === "share_sheet_failed" ? "share_unavailable" : undefined,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}
