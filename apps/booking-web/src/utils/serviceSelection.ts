import type {
  PublicBookingService,
  ServiceLocale,
  ServiceTranslation,
} from "@schedule-app/api";

export function getLocalizedServiceContent(
  service: PublicBookingService,
  locale: ServiceLocale,
): ServiceTranslation {
  const translation = service.translations?.[locale];
  return {
    name: translation?.name?.trim() || service.name,
    description: translation?.description?.trim() || service.description,
    category: translation?.category?.trim() || service.category,
  };
}

export function getServiceSelectionSummary(
  services: readonly PublicBookingService[],
) {
  return services.reduce(
    (summary, service) => ({
      durationMinutes: summary.durationMinutes + service.durationMinutes,
      priceAmount: summary.priceAmount + service.priceAmount,
    }),
    { durationMinutes: 0, priceAmount: 0 },
  );
}
