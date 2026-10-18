import {
  parseServiceTranslations,
  type Database,
  type ServiceLocale,
  type ServiceTranslations,
} from "@schedule-app/api";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Service } from "../../types";

export type ServiceDraft = {
  readonly bufferAfterMinutes: string;
  readonly bufferBeforeMinutes: string;
  readonly currency: string;
  readonly category: string;
  readonly description: string;
  readonly durationMinutes: string;
  readonly name: string;
  readonly priceAmount: string;
  readonly sortOrder: string;
  readonly sourceLocale?: ServiceLocale;
  readonly translations?: ServiceTranslations;
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

export type ServiceCatalogStatus = "active" | "archived";

export type ServiceCatalogFilters = {
  readonly category: string | null;
  readonly query: string;
  readonly status: ServiceCatalogStatus;
};

type ServiceClient = SupabaseClient<Database>;

export type ServiceTranslationQuota = {
  readonly limit: number;
  readonly remaining: number;
  readonly resetsAt: string;
  readonly used: number;
};

export type ServiceTranslationResult = {
  readonly quota: ServiceTranslationQuota;
  readonly translations: ServiceTranslations;
};

export class ServiceTranslationQuotaExceededError extends Error {
  readonly quota: ServiceTranslationQuota | null;

  constructor(quota: ServiceTranslationQuota | null) {
    super("translation_quota_exceeded");
    this.name = "ServiceTranslationQuotaExceededError";
    this.quota = quota;
  }
}

const serviceFields =
  "id, name, category, description, duration_minutes, buffer_before_minutes, buffer_after_minutes, price_amount, currency, is_active, sort_order, archived_at, source_locale, translations";

export function getServiceCategories(services: readonly Service[]): string[] {
  return [
    ...new Set(
      services.map((service) => service.category?.trim() ?? "").filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

export function filterServices(
  services: readonly Service[],
  filters: ServiceCatalogFilters,
): Service[] {
  const query = normalizeSearchText(filters.query);

  return services.filter((service) => {
    const isActive = service.is_active && !service.archived_at;
    if (filters.status === "active" ? !isActive : isActive) return false;

    if (filters.category !== null) {
      const category = service.category?.trim() ?? "";
      if (category !== filters.category) return false;
    }

    if (!query) return true;
    return [service.name, service.description ?? ""].some((value) =>
      normalizeSearchText(value).includes(query),
    );
  });
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

export function createServiceDraft(
  service?: Service | null,
  defaultLocale: ServiceLocale = "cz",
): ServiceDraft {
  return {
    bufferAfterMinutes: String(service?.buffer_after_minutes ?? 0),
    bufferBeforeMinutes: String(service?.buffer_before_minutes ?? 0),
    currency: service?.currency ?? "CZK",
    category: service?.category ?? "",
    description: service?.description ?? "",
    durationMinutes: String(service?.duration_minutes ?? 60),
    name: service?.name ?? "",
    priceAmount: String(service?.price_amount ?? 0),
    sortOrder: String(service?.sort_order ?? 0),
    sourceLocale: service?.source_locale ?? defaultLocale,
    translations: service?.translations ?? {},
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
  return (data ?? []).map((service) => ({
    ...service,
    translations: parseServiceTranslations(service.translations),
  }));
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
  return { ...data, translations: parseServiceTranslations(data.translations) };
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
  return { ...data, translations: parseServiceTranslations(data.translations) };
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

export async function suggestServiceTranslations(
  client: ServiceClient,
  workspaceId: string,
  input: Pick<
    ServiceDraft,
    "category" | "description" | "name" | "sourceLocale"
  >,
): Promise<ServiceTranslationResult> {
  const { data, error } = await client.functions.invoke(
    "translate-service-content",
    {
      body: {
        category: input.category.trim() || null,
        description: input.description.trim() || null,
        name: input.name.trim(),
        sourceLocale: input.sourceLocale,
        workspaceId,
      },
    },
  );
  if (error) {
    if (
      error instanceof FunctionsHttpError &&
      error.context instanceof Response
    ) {
      const body = (await error.context
        .clone()
        .json()
        .catch(() => null)) as Record<string, unknown> | null;
      if (body?.error === "translation_quota_exceeded") {
        throw new ServiceTranslationQuotaExceededError(
          parseServiceTranslationQuota(body.quota),
        );
      }
    }
    throw new Error(error.message);
  }
  if (!data || typeof data.translations !== "object") {
    throw new Error("Translation response is invalid");
  }
  const translations = parseServiceTranslations(data.translations);
  if (Object.keys(translations).length !== 4) {
    throw new Error("Translation response is incomplete");
  }
  const quota = parseServiceTranslationQuota(data.quota);
  if (!quota) throw new Error("Translation quota response is invalid");
  return { translations, quota };
}

function parseServiceTranslationQuota(
  value: unknown,
): ServiceTranslationQuota | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const quota = value as Record<string, unknown>;
  if (
    typeof quota.used !== "number" ||
    typeof quota.limit !== "number" ||
    typeof quota.remaining !== "number" ||
    typeof quota.resetsAt !== "string" ||
    !Number.isInteger(quota.used) ||
    !Number.isInteger(quota.limit) ||
    !Number.isInteger(quota.remaining) ||
    Number.isNaN(Date.parse(quota.resetsAt))
  ) {
    return null;
  }
  return {
    used: quota.used,
    limit: quota.limit,
    remaining: quota.remaining,
    resetsAt: quota.resetsAt,
  };
}

function toServiceInput(draft: ServiceDraft) {
  return {
    buffer_after_minutes: Number(draft.bufferAfterMinutes),
    buffer_before_minutes: Number(draft.bufferBeforeMinutes),
    currency: draft.currency.trim().toUpperCase(),
    category: draft.category.trim() || null,
    description: draft.description.trim() || null,
    duration_minutes: Number(draft.durationMinutes),
    name: draft.name.trim(),
    price_amount: Number(draft.priceAmount),
    sort_order: Number(draft.sortOrder),
    source_locale: draft.sourceLocale ?? "cz",
    translations: draft.translations ?? {},
  };
}

function isIntegerInRange(value: string, min: number, max: number): boolean {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}
