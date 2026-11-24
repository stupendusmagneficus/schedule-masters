import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppointmentStatus, AvailableSlot } from "./manualBooking";

type RescheduleClient = SupabaseClient<Database>;

type ReschedulableAppointment = {
  readonly starts_at: string;
  readonly status: AppointmentStatus;
};

export function canRescheduleAppointment(
  appointment: ReschedulableAppointment,
  now: Date = new Date(),
): boolean {
  return (
    (appointment.status === "pending" || appointment.status === "confirmed") &&
    new Date(appointment.starts_at).getTime() > now.getTime()
  );
}

export async function listRescheduleSlots(
  client: RescheduleClient,
  workspaceId: string,
  appointmentId: string,
  date: string,
): Promise<AvailableSlot[]> {
  const { data, error } = await client.rpc("get_master_reschedule_slots", {
    p_appointment_id: appointmentId,
    p_date: date,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function rescheduleMasterAppointment(
  client: RescheduleClient,
  workspaceId: string,
  appointmentId: string,
  startsAt: string,
): Promise<void> {
  const { error } = await client.rpc("reschedule_master_appointment", {
    p_appointment_id: appointmentId,
    p_starts_at: startsAt,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
}
