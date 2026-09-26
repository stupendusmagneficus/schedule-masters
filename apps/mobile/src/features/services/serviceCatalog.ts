import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Service } from "../../types";

export type ServiceDraft = {
  readonly bufferAfterMinutes: string;
  readonly bufferBeforeMinutes: string;
  readonly currency: string;
  readonly description: string;
  readonly durationMinutes: string;
  readonly name: string;
  readonly priceAmount: string;
  readonly sortOrder: string;
};

export type ServiceValidationError =
  | "bufferAfterMinutes"
  | "bufferBeforeMinutes"
  | "currency"
  | "description"
  | "durationMinutes"
  | "name"
  | "priceAmount"
  | "sortOrder";

type ServiceClient = SupabaseClient<Database>;

const serviceFields =
  "id, name, description, duration_minutes, buffer_before_minutes, buffer_after_minutes, price_amount, currency, is_active, sort_order, archived_at";

export function createServiceDraft(service?: Service | null): ServiceDraft {
  return {
    bufferAfterMinutes: String(service?.buffer_after_minutes ?? 0),
    bufferBeforeMinutes: String(service?.buffer_before_minutes ?? 0),
    currency: service?.currency ?? "CZK",
    description: service?.description ?? "",
    durationMinutes: String(service?.duration_minutes ?? 60),
    name: service?.name ?? "",
    priceAmount: String(service?.price_amount ?? 0),
    sortOrder: String(service?.sort_order ?? 0),
  };
}

export function validateServiceDraft(
  draft: ServiceDraft,
): ServiceValidationError | null {
  const name = draft.name.trim();
  if (!name || name.length > 120) return "name";
  if (draft.description.trim().length > 1000) return "description";

  if (!isIntegerInRange(draft.durationMinutes, 1, 1440)) {
    return "durationMinutes";
  }
  if (!isIntegerInRange(draft.bufferBeforeMinutes, 0, 240)) {
    return "bufferBeforeMinutes";
  }
  if (!isIntegerInRange(draft.bufferAfterMinutes, 0, 240)) {
    return "bufferAfterMinutes";
  }

  const price = Number(draft.priceAmount);
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
    return "priceAmount";
  }
  if (!/^[A-Z]{3}$/.test(draft.currency.trim().toUpperCase())) {
    return "currency";
  }
  if (!isIntegerInRange(draft.sortOrder, 0, 100_000)) return "sortOrder";
  return null;
}

export async function listServices(
  client: ServiceClient,
  workspaceId: string,
): Promise<Service[]> {
  const { data, error } = await client
    .from("services")
    .select(serviceFields)
    .eq("workspace_id", workspaceId)
    .order("is_active", { ascending: false })
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createService(
  client: ServiceClient,
  workspaceId: string,
  draft: ServiceDraft,
): Promise<Service> {
  const { data, error } = await client
    .from("services")
    .insert({
      ...toServiceInput(draft),
      is_active: true,
      workspace_id: workspaceId,
    })
    .select(serviceFields)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateService(
  client: ServiceClient,
  workspaceId: string,
  serviceId: string,
  draft: ServiceDraft,
): Promise<Service> {
  const { data, error } = await client
    .from("services")
    .update(toServiceInput(draft))
    .eq("id", serviceId)
    .eq("workspace_id", workspaceId)
    .select(serviceFields)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function archiveService(
  client: ServiceClient,
  workspaceId: string,
  serviceId: string,
): Promise<void> {
  const { error } = await client
    .from("services")
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq("id", serviceId)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function restoreService(
  client: ServiceClient,
  workspaceId: string,
  serviceId: string,
): Promise<void> {
  const { error } = await client
    .from("services")
    .update({ archived_at: null, is_active: true })
    .eq("id", serviceId)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

function toServiceInput(draft: ServiceDraft) {
  return {
    buffer_after_minutes: Number(draft.bufferAfterMinutes),
    buffer_before_minutes: Number(draft.bufferBeforeMinutes),
    currency: draft.currency.trim().toUpperCase(),
    description: draft.description.trim() || null,
    duration_minutes: Number(draft.durationMinutes),
    name: draft.name.trim(),
    price_amount: Number(draft.priceAmount),
    sort_order: Number(draft.sortOrder),
  };
}

function isIntegerInRange(value: string, min: number, max: number): boolean {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}
