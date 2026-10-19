import type { PublicBookingService } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatCurrency, formatDuration } from "@schedule-app/i18n";
import { useMemo, useState } from "react";
import {
  getLocalizedServiceContent,
  getServiceSelectionSummary,
} from "../utils/serviceSelection";

type PublicServicePickerProps = {
  readonly locale: SupportedLocale;
  readonly onToggleService: (serviceId: string) => void;
  readonly selectedServiceIds: readonly string[];
  readonly services: readonly PublicBookingService[];
  readonly t: (key: MessageKey) => string;
};

export function PublicServicePicker({
  locale,
  onToggleService,
  selectedServiceIds,
  services,
  t,
}: PublicServicePickerProps) {
  const [query, setQuery] = useState("");
  const selectedServices = useMemo(
    () =>
      selectedServiceIds
        .map((id) => services.find((service) => service.id === id))
        .filter((service): service is PublicBookingService => Boolean(service)),
    [selectedServiceIds, services],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredServices = services.filter((service) => {
    const content = getLocalizedServiceContent(service, locale);
    return `${content.name} ${content.category ?? ""}`
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const categories = new Map<string, PublicBookingService[]>();

  for (const service of filteredServices) {
    const category =
      getLocalizedServiceContent(service, locale).category ||
      t("booking.categoryOther");
    categories.set(category, [...(categories.get(category) ?? []), service]);
  }

  const summary = getServiceSelectionSummary(selectedServices);
  const currency = selectedServices[0]?.currency ?? services[0]?.currency;

  return (
    <>
      <label className="service-search-label" htmlFor="booking-service-search">
        <span className="visually-hidden">{t("booking.searchServices")}</span>
        <input
          autoComplete="off"
          id="booking-service-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("booking.searchServices")}
          type="search"
          value={query}
        />
      </label>
      {selectedServices.length > 0 && currency && (
        <a
          aria-label={`${t("booking.selectedServices")}: ${selectedServices.length}, ${formatDuration(summary.durationMinutes, locale)}, ${formatCurrency(summary.priceAmount, locale, currency)}`}
          className="service-selection-quick-summary"
          href="#booking-selected-services"
        >
          <span>
            {t("booking.selectedServices")}: {selectedServices.length}
          </span>
          <span>{formatDuration(summary.durationMinutes, locale)}</span>
          <strong>
            {formatCurrency(summary.priceAmount, locale, currency)}
          </strong>
        </a>
      )}
      {categories.size === 0 ? (
        <p className="empty-state" role="status">
          {services.length === 0
            ? t("booking.noServices")
            : t("booking.noMatchingServices")}
        </p>
      ) : (
        <div className="service-categories">
          {[...categories.entries()].map(([category, categoryServices]) => (
            <section
              aria-label={category}
              className="service-category"
              key={category}
            >
              <h3>{category}</h3>
              <div className="service-list">
                {categoryServices.map((service) => {
                  const selected = selectedServiceIds.includes(service.id);
                  const content = getLocalizedServiceContent(service, locale);
                  return (
                    <button
                      aria-pressed={selected}
                      className={
                        selected ? "service-option selected" : "service-option"
                      }
                      key={service.id}
                      onClick={() => onToggleService(service.id)}
                      type="button"
                    >
                      <span className="service-copy">
                        <strong>{content.name}</strong>
                        {content.description ? (
                          <small>{content.description}</small>
                        ) : null}
                        <small className="service-meta">
                          {formatDuration(service.durationMinutes, locale)}
                          <span aria-hidden="true"> · </span>
                          {formatCurrency(
                            service.priceAmount,
                            locale,
                            service.currency,
                          )}
                        </small>
                      </span>
                      <span
                        aria-hidden="true"
                        className="service-selection-mark"
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      {selectedServices.length > 0 && (
        <section
          aria-label={t("booking.selectedServices")}
          className="selected-services-summary"
          id="booking-selected-services"
        >
          <h3>{t("booking.selectedServices")}</h3>
          <ol>
            {selectedServices.map((service) => (
              <li key={service.id}>
                <span className="selected-service-copy">
                  <strong>
                    {getLocalizedServiceContent(service, locale).name}
                  </strong>
                  <small>
                    {formatDuration(service.durationMinutes, locale)}
                    <span aria-hidden="true"> · </span>
                    {formatCurrency(
                      service.priceAmount,
                      locale,
                      service.currency,
                    )}
                  </small>
                </span>
                <button
                  aria-label={t("booking.removeService").replace(
                    "{name}",
                    getLocalizedServiceContent(service, locale).name,
                  )}
                  className="remove-service-button"
                  onClick={() => onToggleService(service.id)}
                  type="button"
                >
                  {t("booking.remove")}
                </button>
              </li>
            ))}
          </ol>
          <dl>
            <div>
              <dt>{t("booking.totalDuration")}</dt>
              <dd>{formatDuration(summary.durationMinutes, locale)}</dd>
            </div>
            {currency && (
              <div>
                <dt>{t("booking.totalPrice")}</dt>
                <dd>{formatCurrency(summary.priceAmount, locale, currency)}</dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </>
  );
}
