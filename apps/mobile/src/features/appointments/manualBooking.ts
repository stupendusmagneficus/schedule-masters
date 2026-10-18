import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ManualBookingCustomer =
  Database["public"]["Functions"]["list_master_customers"]["Returns"][number];
type MasterAppointmentRow =
  Database["public"]["Functions"]["list_master_appointments"]["Returns"][number];
export type MasterAppointment = Omit<
  MasterAppointmentRow,
  | "is_new_customer"
  | "is_returning_customer"
  | "occupied_ends_at"
  | "occupied_starts_at"
  | "master_note"
  | "appointment_series_id"
> & {
  readonly is_new_customer?: boolean;
  readonly is_returning_customer?: boolean;
  readonly occupied_ends_at?: string;
  readonly occupied_starts_at?: string;
  readonly master_note?: string | null;
  readonly appointment_series_id?: string | null;
};
export type AvailableSlot =
  Database["public"]["Functions"]["get_master_available_slots"]["Returns"][number];
export type MonthAvailableSlot =
  Database["public"]["Functions"]["get_master_month_available_slots"]["Returns"][number];
export type AppointmentStatus =
  Database["public"]["Enums"]["appointment_status"];
export type RecurringAppointmentPreview =
  Database["public"]["Functions"]["preview_master_recurring_bookings"]["Returns"][number];

export type ManualBookingDraft = {
  readonly customerId: string | null;
  readonly date: string;
  readonly email: string;
  readonly masterNote: string;
  readonly name: string;
  readonly phone: string;
  readonly serviceIds: readonly string[];
  readonly startsAt: string;
};

export type ManualBookingValidationError =
  | "date"
  | "email"
  | "name"
  | "services"
  | "serviceLimit"
  | "slot";

export const MANUAL_BOOKING_MAX_SERVICES = 20;

type ManualBookingClient = SupabaseClient<Database>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validateManualBookingDraft(
  draft: ManualBookingDraft,
): ManualBookingValidationError | null {
  if (!draft.customerId && !draft.name.trim()) return "name";
  if (draft.email.trim() && !/^\S+@\S+\.\S+$/.test(draft.email.trim())) {
    return "email";
  }
  if (!isValidDate(draft.date)) return "date";
  if (draft.serviceIds.length === 0) return "services";
  if (draft.serviceIds.length > MANUAL_BOOKING_MAX_SERVICES) {
    return "serviceLimit";
  }
  if (!draft.startsAt) return "slot";
  return null;
}

export async function listMasterCustomers(
  client: ManualBookingClient,
  workspaceId: string,
  search = "",
): Promise<ManualBookingCustomer[]> {
  const { data, error } = await client.rpc("list_master_customers", {
    p_search: search.trim() || undefined,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return deduplicateManualBookingCustomers(data ?? []);
}

export function deduplicateManualBookingCustomers(
  customers: readonly ManualBookingCustomer[],
): ManualBookingCustomer[] {
  const seenCustomerIds = new Set<string>();
  return customers.filter((customer) => {
    if (seenCustomerIds.has(customer.id)) return false;
    seenCustomerIds.add(customer.id);
    return true;
  });
}

export async function listMasterAvailableSlots(
  client: ManualBookingClient,
  workspaceId: string,
  serviceIds: readonly string[],
  date: string,
): Promise<AvailableSlot[]> {
  const { data, error } = await client.rpc(
    "get_master_available_slots_for_services",
    {
      p_date: date,
      p_service_ids: [...serviceIds],
      p_workspace_id: workspaceId,
    },
  );
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listMasterMonthAvailableSlots(
  client: ManualBookingClient,
  workspaceId: string,
  serviceId: string,
  dateInMonth: string,
): Promise<MonthAvailableSlot[]> {
  const monthStart = /^\d{4}-\d{2}-\d{2}$/.test(dateInMonth)
    ? `${dateInMonth.slice(0, 7)}-01`
    : dateInMonth;
  const { data, error } = await client.rpc("get_master_month_available_slots", {
    p_month_start: monthStart,
    p_service_id: serviceId,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createMasterBooking(
  client: ManualBookingClient,
  workspaceId: string,
  draft: ManualBookingDraft,
  idempotencyKey = createIdempotencyKey(),
): Promise<Record<string, unknown>> {
  const { data, error } = await client.rpc(
    "create_master_booking_with_services",
    {
      p_customer_id: draft.customerId ?? undefined,
      p_email: draft.email.trim() || undefined,
      p_idempotency_key: idempotencyKey,
      p_master_note: draft.masterNote.trim() || undefined,
      p_name: draft.name.trim() || undefined,
      p_phone: draft.phone.trim() || undefined,
      p_service_ids: [...draft.serviceIds],
      p_starts_at: draft.startsAt,
      p_workspace_id: workspaceId,
    },
  );
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Booking response is invalid");
  }
  return data as Record<string, unknown>;
}

export async function createMasterRecurringBookings(
  client: ManualBookingClient,
  workspaceId: string,
  draft: ManualBookingDraft,
  intervalWeeks: number,
  occurrenceCount: number,
  excludedDates: readonly string[] = [],
  idempotencyKey = createIdempotencyKey(),
): Promise<string[]> {
  const { data, error } = await client.rpc("create_master_recurring_bookings", {
    p_customer_id: draft.customerId ?? undefined,
    p_email: draft.email.trim() || undefined,
    p_excluded_dates: [...excludedDates],
    p_idempotency_key: idempotencyKey,
    p_interval_weeks: intervalWeeks,
    p_master_note: draft.masterNote.trim() || undefined,
    p_name: draft.name.trim() || undefined,
    p_occurrence_count: occurrenceCount,
    p_phone: draft.phone.trim() || undefined,
    p_service_ids: [...draft.serviceIds],
    p_starts_at: draft.startsAt,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Recurring booking response is invalid");
  }
  const appointments = (data as { appointments?: unknown }).appointments;
  if (
    !Array.isArray(appointments) ||
    appointments.length === 0 ||
    appointments.length > occurrenceCount
  ) {
    throw new Error("Recurring booking response is invalid");
  }
  return appointments.map((appointment) => {
    if (!appointment || typeof appointment !== "object") {
      throw new Error("Recurring booking response is invalid");
    }
    const id = (appointment as { id?: unknown }).id;
    if (typeof id !== "string") {
      throw new Error("Recurring booking response is invalid");
    }
    return id;
  });
}

export async function previewMasterRecurringBookings(
  client: ManualBookingClient,
  workspaceId: string,
  serviceIds: readonly string[],
  startsAt: string,
  intervalWeeks: number,
  occurrenceCount: number,
): Promise<RecurringAppointmentPreview[]> {
  const { data, error } = await client.rpc(
    "preview_master_recurring_bookings",
    {
      p_interval_weeks: intervalWeeks,
      p_occurrence_count: occurrenceCount,
      p_service_ids: [...serviceIds],
      p_starts_at: startsAt,
      p_workspace_id: workspaceId,
    },
  );
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function cancelMasterAppointmentSeriesFuture(
  client: ManualBookingClient,
  workspaceId: string,
  appointmentId: string,
): Promise<number> {
  const { data, error } = await client.rpc(
    "cancel_master_appointment_series_future",
    { p_appointment_id: appointmentId, p_workspace_id: workspaceId },
  );
  if (error) throw new Error(error.message);
  const count =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as { cancelledCount?: unknown }).cancelledCount
      : null;
  if (typeof count !== "number" || !Number.isInteger(count)) {
    throw new Error("Recurring booking cancellation response is invalid");
  }
  return count;
}

export async function listMasterAppointments(
  client: ManualBookingClient,
  workspaceId: string,
  fromDate: string,
  toDate: string,
): Promise<MasterAppointment[]> {
  const { data, error } = await client.rpc("list_master_appointments", {
    p_from_date: fromDate,
    p_to_date: toDate,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function setMasterAppointmentStatus(
  client: ManualBookingClient,
  appointmentId: string,
  status: AppointmentStatus,
  reason?: string,
): Promise<{
  id: string;
  notificationStatus?:
    | "accepted_by_provider"
    | "failed"
    | "not_configured"
    | "pending"
    | "processing"
    | null;
  status: AppointmentStatus;
}> {
  const { data, error } = await client.rpc("set_appointment_status", {
    p_appointment_id: appointmentId,
    p_reason: reason?.trim() || undefined,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Appointment status response is invalid");
  }

  const response = data as {
    id?: unknown;
    notificationStatus?: unknown;
    status?: unknown;
  };
  if (typeof response.id !== "string" || typeof response.status !== "string") {
    throw new Error("Appointment status response is invalid");
  }

  const notificationStatuses = new Set([
    "accepted_by_provider",
    "failed",
    "not_configured",
    "pending",
    "processing",
  ]);
  if (
    response.notificationStatus !== undefined &&
    response.notificationStatus !== null &&
    !notificationStatuses.has(String(response.notificationStatus))
  ) {
    throw new Error("Appointment notification status response is invalid");
  }

  return {
    id: response.id,
    notificationStatus: response.notificationStatus as
      | "accepted_by_provider"
      | "failed"
      | "not_configured"
      | "pending"
      | "processing"
      | null
      | undefined,
    status: response.status as AppointmentStatus,
  };
}

export async function setMasterAppointmentPaidAmount(
  client: ManualBookingClient,
  appointmentId: string,
  amount: number,
): Promise<number> {
  const { data, error } = await client.rpc(
    "set_master_appointment_paid_amount",
    { p_appointment_id: appointmentId, p_paid_amount: amount },
  );
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Appointment payment response is invalid");
  }
  const paidAmount = (data as { paid_amount?: unknown }).paid_amount;
  if (typeof paidAmount !== "number" || !Number.isFinite(paidAmount)) {
    throw new Error("Appointment payment response is invalid");
  }
  return paidAmount;
}

export async function setMasterAppointmentNote(
  client: ManualBookingClient,
  workspaceId: string,
  appointmentId: string,
  note: string,
): Promise<string | null> {
  const trimmedNote = note.trim();
  if (trimmedNote.length > 1000) {
    throw new Error("Appointment note must be 1000 characters or fewer");
  }
  const { data, error } = await client.rpc("set_master_appointment_note", {
    p_appointment_id: appointmentId,
    p_master_note: trimmedNote || null,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Appointment note response is invalid");
  }
  const masterNote = (data as { master_note?: unknown }).master_note;
  if (masterNote !== null && typeof masterNote !== "string") {
    throw new Error("Appointment note response is invalid");
  }
  return masterNote;
}

export function createIdempotencyKey(): string {
  const cryptoApi = globalThis as typeof globalThis & {
    crypto?: { randomUUID?: () => string };
  };
  return (
    cryptoApi.crypto?.randomUUID?.() ??
    `manual-booking-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function isValidDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
}
