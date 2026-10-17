import type { PublicBookingService } from "@schedule-app/api";

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
