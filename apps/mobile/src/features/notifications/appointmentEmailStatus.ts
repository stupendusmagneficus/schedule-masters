import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
export const emailStates = [
  "pending",
  "not_configured",
  "processing",
  "accepted_by_provider",
  "superseded",
  "failed",
  "sent",
  "delayed",
  "delivered",
  "bounced",
  "complained",
  "suppressed",
] as const;
export type EmailState = (typeof emailStates)[number];
export type AppointmentEmail = {
  readonly id: string;
  readonly event_type: string;
  readonly state: EmailState;
  readonly created_at: string;
};
export function parseAppointmentEmails(value: unknown): AppointmentEmail[] {
  if (!Array.isArray(value) || value.length > 5)
    throw new Error("Invalid email status response");
  return value.map((row) => {
    if (
      !row ||
      typeof row.id !== "string" ||
      typeof row.event_type !== "string" ||
      !emailStates.includes(row.state) ||
      typeof row.created_at !== "string" ||
      !Number.isFinite(Date.parse(row.created_at))
    )
      throw new Error("Invalid email status response");
    return {
      id: row.id,
      event_type: row.event_type,
      state: row.state,
      created_at: row.created_at,
    };
  });
}
export async function listAppointmentEmails(
  client: SupabaseClient<Database>,
  workspaceId: string,
  appointmentId: string,
) {
  const { data, error } = await client.rpc("list_master_appointment_emails", {
    p_workspace_id: workspaceId,
    p_appointment_id: appointmentId,
  });
  if (error) throw new Error("Email status unavailable");
  return parseAppointmentEmails(data);
}
