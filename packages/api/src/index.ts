export type ApiBoundary = {
  readonly name: "schedule-masters-api";
};

export type {
  SupabaseDatabaseClient,
  SupabaseStorage,
} from "./supabase/client";
export { createSupabaseClient } from "./supabase/client";
export type { Database } from "./supabase/database.types";

export type ServiceLocale = "en" | "cz" | "sk" | "ru" | "uk";

export type ServiceTranslation = {
  readonly category: string | null;
  readonly description: string | null;
  readonly name: string;
};

export type ServiceTranslations = Partial<
  Record<ServiceLocale, ServiceTranslation>
>;

export type PublicBookingService = {
  readonly id: string;
  readonly name: string;
  readonly translations?: ServiceTranslations;
  readonly description: string | null;
  readonly category: string | null;
  readonly durationMinutes: number;
  readonly priceAmount: number;
  readonly currency: string;
};

export type PublicBookingContext = {
  readonly workspace: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly timezone: string;
  };
  readonly services: PublicBookingService[];
};

export type PublicBookingResult = {
  readonly id: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly serviceName: string;
  readonly serviceItems?: readonly {
    readonly serviceName: string;
    readonly durationMinutes: number;
    readonly priceAmount: number;
    readonly currency: string;
  }[];
  readonly durationMinutes?: number;
  readonly priceAmount?: number;
  readonly status: string;
};

export function parsePublicBookingContext(
  value: unknown,
): PublicBookingContext {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid booking context");
  }

  const context = value as Record<string, unknown>;
  const workspace = context.workspace as Record<string, unknown> | undefined;
  const services = Array.isArray(context.services) ? context.services : [];

  if (
    !workspace ||
    typeof workspace.id !== "string" ||
    typeof workspace.name !== "string" ||
    typeof workspace.slug !== "string" ||
    typeof workspace.timezone !== "string"
  ) {
    throw new Error("Invalid workspace in booking context");
  }

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      timezone: workspace.timezone,
    },
    services: services.map((service) => {
      const item = service as Record<string, unknown>;
      if (
        typeof item.id !== "string" ||
        typeof item.name !== "string" ||
        typeof item.durationMinutes !== "number" ||
        typeof item.priceAmount !== "number" ||
        typeof item.currency !== "string"
      ) {
        throw new Error("Invalid service in booking context");
      }

      return {
        id: item.id,
        name: item.name,
        translations: parseServiceTranslations(item.translations),
        description:
          typeof item.description === "string" ? item.description : null,
        category:
          typeof item.category === "string" && item.category.trim()
            ? item.category.trim()
            : null,
        durationMinutes: item.durationMinutes,
        priceAmount: item.priceAmount,
        currency: item.currency,
      };
    }),
  };
}

export function parseServiceTranslations(value: unknown): ServiceTranslations {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const translations: ServiceTranslations = {};
  for (const locale of ["en", "cz", "sk", "ru", "uk"] as const) {
    const raw = (value as Record<string, unknown>)[locale];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.name !== "string" || !item.name.trim()) continue;
    translations[locale] = {
      name: item.name,
      description:
        typeof item.description === "string" ? item.description : null,
      category: typeof item.category === "string" ? item.category : null,
    };
  }
  return translations;
}
