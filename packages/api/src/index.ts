export type ApiBoundary = {
  readonly name: "schedule-masters-api";
};

export { createSupabaseClient } from "./supabase/client";
export type { Database } from "./supabase/database.types";

export type PublicBookingService = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
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
        description:
          typeof item.description === "string" ? item.description : null,
        durationMinutes: item.durationMinutes,
        priceAmount: item.priceAmount,
        currency: item.currency,
      };
    }),
  };
}
