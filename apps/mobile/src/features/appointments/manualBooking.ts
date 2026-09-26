import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ManualBookingCustomer =
  Database["public"]["Functions"]["list_master_customers"]["Returns"][number];
export type MasterAppointment =
  Database["public"]["Functions"]["list_master_appointments"]["Returns"][number];
export type AvailableSlot =
  Database["public"]["Functions"]["get_master_available_slots"]["Returns"][number];

export type ManualBookingDraft = {
  readonly customerId: string | null;
  readonly date: string;
  readonly durationMinutes: string;
  readonly email: string;
  readonly masterNote: string;
  readonly name: string;
  readonly phone: string;
  readonly priceAmount: string;
  readonly serviceId: string;
  readonly startsAt: string;
};

export type ManualBookingValidationError =
  | "date"
  | "duration"
  | "email"
  | "name"
  | "price"
  | "slot";

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
  if (!draft.startsAt) return "slot";

  const duration = Number(draft.durationMinutes);
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
    return "duration";
  }

  const price = Number(draft.priceAmount);
  if (!Number.isFinite(price) || price < 0) return "price";
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
  serviceId: string,
  date: string,
): Promise<AvailableSlot[]> {
  const { data, error } = await client.rpc("get_master_available_slots", {
    p_date: date,
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
  const { data, error } = await client.rpc("create_master_booking", {
    p_customer_id: draft.customerId ?? undefined,
    p_duration_minutes: Number(draft.durationMinutes),
    p_email: draft.email.trim() || undefined,
    p_idempotency_key: idempotencyKey,
    p_master_note: draft.masterNote.trim() || undefined,
    p_name: draft.name.trim() || undefined,
    p_phone: draft.phone.trim() || undefined,
    p_price_amount: Number(draft.priceAmount),
    p_service_id: draft.serviceId,
    p_starts_at: draft.startsAt,
    p_workspace_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Booking response is invalid");
  }
  return data as Record<string, unknown>;
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
