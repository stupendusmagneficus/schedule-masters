"use client";

import { analyticsEvents } from "@schedule-app/analytics";
import {
  createSupabaseClient,
  type PublicBookingContext,
  type PublicBookingResult,
  parsePublicBookingContext,
} from "@schedule-app/api";
import {
  createTranslator,
  detectLocale,
  formatCurrency,
  formatDate,
  formatTime,
  localeLabels,
  type SupportedLocale,
  supportedLocales,
} from "@schedule-app/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { CustomerAppointmentPage } from "../src/components/CustomerAppointmentPage";
import { PublicServicePicker } from "../src/components/PublicServicePicker";
import { analytics } from "../src/lib/analytics";
import {
  getFollowingBookableDate,
  getNextBookableDate,
  parseDateInput,
} from "../src/utils/dates";
import { isValidBookingEmail } from "../src/utils/emailValidation";
import { getLocalizedServiceContent } from "../src/utils/serviceSelection";

const localeStorageKey = "schedule-app-locale";
const demoWorkspaceId = "00000000-0000-0000-0000-000000000001";
const demoServiceId = "00000000-0000-0000-0000-000000000002";

type Slot = { startsAt: string; endsAt: string };

const demoContext: PublicBookingContext = {
  workspace: {
    id: demoWorkspaceId,
    name: "Demo Studio",
    slug: "demo-studio",
    timezone: "Europe/Prague",
  },
  services: [
    {
      id: demoServiceId,
      name: "Demo manicure",
      description: "Careful manicure with a clean, polished finish.",
      category: "Manicure",
      translations: {},
      durationMinutes: 60,
      priceAmount: 700,
      currency: "CZK",
    },
  ],
};

function getDemoSlots(date: string): Slot[] {
  const day = new Date(`${date}T00:00:00`);
  if (Number.isNaN(day.getTime()) || day.getDay() === 0 || day.getDay() === 6) {
    return [];
  }

  return ["09:30", "11:00", "13:00", "15:30"].map((time) => {
    const start = new Date(`${date}T${time}:00+02:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { startsAt: start.toISOString(), endsAt: end.toISOString() };
  });
}

function isConfiguredSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project"),
  );
}

function isDemoBookingPage() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("demo") === "1"
  );
}

export default function HomePage() {
  const [locale, setLocale] = useState<SupportedLocale>(detectLocale);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [context, setContext] = useState<PublicBookingContext | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [contextLoadError, setContextLoadError] = useState(false);
  const [managementToken, setManagementToken] = useState<string | null>(null);
  const [date, setDate] = useState(getNextBookableDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PublicBookingResult | null>(
    null,
  );
  const bookingRequestKey = useRef<string | null>(null);
  const demoMode = isDemoBookingPage();
  const supabase = useMemo(() => {
    if (demoMode) return null;
    if (!isConfiguredSupabase()) return null;
    return createSupabaseClient({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      publishableKey: process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
    });
  }, [demoMode]);
  const selectedServices = selectedServiceIds
    .map((id) => context?.services.find((service) => service.id === id))
    .filter((service) => service !== undefined);
  const selectedDateLabel = formatDate(parseDateInput(date), locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
  const availabilityForSelectedDate = t(
    "booking.availableTimesForDate",
  ).replace("{date}", selectedDateLabel);
  const noSlotsForSelectedDate = t("booking.noSlotsForDate").replace(
    "{date}",
    selectedDateLabel,
  );

  useEffect(() => {
    if (hasManagementTokenInLocation()) return;
    void analytics.init();
    analytics.track(analyticsEvents.bookingPageViewed);
  }, []);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(localeStorageKey);
    if (storedLocale) {
      setLocale(detectLocale(storedLocale));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
    document.documentElement.lang = locale === "cz" ? "cs" : locale;
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    async function loadContext() {
      setIsLoadingContext(true);
      setContextLoadError(false);

      if (isDemoBookingPage()) {
        setContext(demoContext);
        setSelectedServiceIds([demoServiceId]);
        setIsLoadingContext(false);
        return;
      }

      const slug = new URLSearchParams(window.location.search)
        .get("slug")
        ?.trim();
      const token = getManagementTokenFromLocation();
      if (token) {
        setManagementToken(token);
        setContext(null);
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
        setIsLoadingContext(false);
        return;
      }
      if (!slug || !supabase) {
        setContext(null);
        setContextLoadError(true);
        setIsLoadingContext(false);
        return;
      }

      try {
        const { data, error: contextError } = await supabase.rpc(
          "get_public_booking_context",
          { p_slug: slug },
        );
        if (contextError || !data)
          throw new Error("Booking context unavailable");

        const parsed = parsePublicBookingContext(data);
        if (cancelled) return;
        setContext(parsed);
        setSelectedServiceIds(
          parsed.services[0] ? [parsed.services[0].id] : [],
        );
      } catch {
        if (!cancelled) {
          setContext(null);
          setContextLoadError(true);
        }
      } finally {
        if (!cancelled) setIsLoadingContext(false);
      }
    }
    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function loadSlots() {
      setSelectedSlot(null);
      setSlots([]);
      setError(null);
      setIsLoadingSlots(true);
      if (isDemoBookingPage()) {
        setSlots(getDemoSlots(date));
        setIsLoadingSlots(false);
        return;
      }
      if (selectedServiceIds.length === 0) {
        setSlots([]);
        setIsLoadingSlots(false);
        return;
      }
      if (!supabase) {
        setSlots([]);
        setIsLoadingSlots(false);
        return;
      }
      const slug = new URLSearchParams(window.location.search).get("slug");
      if (!slug) {
        setSlots([]);
        setError(t("booking.unavailable"));
        setIsLoadingSlots(false);
        return;
      }
      const { data, error: slotsError } = await supabase.rpc(
        "get_public_available_slots_for_services",
        {
          p_date: date,
          p_service_ids: selectedServiceIds,
          p_slug: slug,
        },
      );
      if (cancelled) return;
      if (slotsError) {
        setError(t("booking.availabilityFailed"));
        setSlots([]);
        setIsLoadingSlots(false);
        return;
      }
      setSlots(
        (data ?? []).map((slot) => ({
          startsAt: slot.starts_at,
          endsAt: slot.ends_at,
        })),
      );
      setIsLoadingSlots(false);
    }
    void loadSlots();
    return () => {
      cancelled = true;
    };
  }, [date, selectedServiceIds, supabase, t]);

  async function submitBooking() {
    if (selectedServices.length === 0) {
      setError(t("booking.selectService"));
      return;
    }
    if (!selectedSlot) {
      setError(t("booking.selectTime"));
      return;
    }
    if (!name.trim()) {
      setError(t("booking.nameRequired"));
      return;
    }
    if (!email.trim()) {
      setError(t("booking.emailRequired"));
      return;
    }
    if (!isValidBookingEmail(email)) {
      setError(t("booking.emailInvalid"));
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      if (isDemoBookingPage()) {
        setConfirmation({
          id: `demo-${Date.now()}`,
          startsAt: selectedSlot.startsAt,
          endsAt: new Date(
            new Date(selectedSlot.startsAt).getTime() +
              selectedServices.reduce(
                (total, service) => total + service.durationMinutes,
                0,
              ) *
                60_000,
          ).toISOString(),
          serviceName: selectedServices
            .map((service) => getLocalizedServiceContent(service, locale).name)
            .join(" + "),
          durationMinutes: selectedServices.reduce(
            (total, service) => total + service.durationMinutes,
            0,
          ),
          priceAmount: selectedServices.reduce(
            (total, service) => total + service.priceAmount,
            0,
          ),
          serviceItems: selectedServices.map((service) => ({
            serviceName: getLocalizedServiceContent(service, locale).name,
            durationMinutes: service.durationMinutes,
            priceAmount: service.priceAmount,
            currency: service.currency,
          })),
          status: "pending",
        });
        analytics.track(analyticsEvents.publicBookingSucceeded, {
          locale,
          mode: "demo",
        });
        return;
      }
      if (!supabase) {
        throw new Error(t("common.error"));
      }
      const slug = new URLSearchParams(window.location.search).get("slug");
      if (!slug) throw new Error("Booking slug is missing");
      const idempotencyKey = bookingRequestKey.current ?? crypto.randomUUID();
      bookingRequestKey.current = idempotencyKey;
      analytics.track(analyticsEvents.publicBookingSubmitted, { locale });
      const { data, error: bookingError } = await supabase.rpc(
        "create_public_booking_with_services",
        {
          p_customer_note: note || undefined,
          p_email: email,
          p_idempotency_key: idempotencyKey,
          p_locale: locale,
          p_name: name,
          p_phone: phone,
          p_service_ids: selectedServiceIds,
          p_slug: slug,
          p_starts_at: selectedSlot.startsAt,
        },
      );
      if (bookingError) {
        if (
          bookingError.message.includes("Selected time is no longer available")
        ) {
          setSelectedSlot(null);
          setSlots((current) =>
            current.filter((slot) => slot.startsAt !== selectedSlot.startsAt),
          );
          setError(t("booking.slotNoLongerAvailable"));
          return;
        }
        throw new Error(bookingError.message);
      }
      analytics.track(analyticsEvents.publicBookingSucceeded, { locale });
      const bookingResult = data as unknown as PublicBookingResult;
      setConfirmation({
        ...bookingResult,
        serviceName: selectedServices
          .map((service) => getLocalizedServiceContent(service, locale).name)
          .join(" + "),
      });
    } catch {
      analytics.track(analyticsEvents.publicBookingFailed, {
        locale,
        reason: "request_failed",
      });
      setError(t("booking.submitFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoadingContext) {
    return (
      <main className="booking-page page-shell" aria-busy="true">
        <section className="booking-panel">
          <p className="empty-state" role="status">
            {t("booking.loadingContext")}
          </p>
        </section>
      </main>
    );
  }

  if (managementToken && supabase) {
    return (
      <CustomerAppointmentPage
        client={supabase}
        locale={locale}
        token={managementToken}
      />
    );
  }

  if (!context || contextLoadError) {
    return (
      <main className="booking-page page-shell">
        <section className="booking-panel confirmation-panel">
          <p className="eyebrow">{t("common.appName")}</p>
          <h1>{t("booking.unavailableTitle")}</h1>
          <p className="muted-copy">{t("booking.unavailableDescription")}</p>
          <p className="error-state" role="alert">
            {t("booking.unavailable")}
          </p>
          <button
            className="secondary-button neutral-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            {t("common.retry")}
          </button>
        </section>
      </main>
    );
  }

  if (confirmation) {
    return (
      <main className="booking-page page-shell">
        <section className="booking-panel confirmation-panel">
          <span className="success-mark" aria-hidden="true">
            ✓
          </span>
          <p className="eyebrow">
            {confirmation.status === "confirmed"
              ? t("booking.confirmed")
              : t("booking.requestReceived")}
          </p>
          <h1>{context.workspace.name}</h1>
          {confirmation.status !== "confirmed" && (
            <p className="muted-copy">{t("booking.pendingConfirmation")}</p>
          )}
          <p className="confirmation-copy">
            {confirmation.serviceItems
              ?.map((item) => item.serviceName)
              .join(" + ") ?? confirmation.serviceName}{" "}
            · {formatDate(new Date(confirmation.startsAt), locale)} ·{" "}
            {formatTime(new Date(confirmation.startsAt), locale)}
          </p>
          {confirmation.durationMinutes !== undefined && (
            <p className="confirmation-total">
              {t("booking.totalDuration")}: {confirmation.durationMinutes} min
            </p>
          )}
          {confirmation.priceAmount !== undefined && (
            <p className="confirmation-total">
              {t("booking.totalPrice")}:{" "}
              {formatCurrency(
                confirmation.priceAmount,
                locale,
                confirmation.serviceItems?.[0]?.currency ??
                  context.services[0]?.currency ??
                  "CZK",
              )}
            </p>
          )}
          <button
            className="secondary-button neutral-button confirmation-close-button"
            type="button"
            onClick={() => {
              bookingRequestKey.current = null;
              setConfirmation(null);
            }}
          >
            {t("booking.close")}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="booking-page page-shell">
      <section className="booking-panel">
        <div className="booking-header">
          <div>
            <p className="eyebrow">{t("common.appName")}</p>
            <h1>{context.workspace.name}</h1>
            <p className="muted-copy">{t("booking.description")}</p>
          </div>
          <div
            className="language-picker"
            aria-label={t("common.language")}
            role="radiogroup"
          >
            {supportedLocales.map((item) => (
              <button
                aria-checked={item === locale}
                className={
                  item === locale
                    ? "language-button selected"
                    : "language-button"
                }
                key={item}
                onClick={() => setLocale(item)}
                role="radio"
                type="button"
              >
                {localeLabels[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="booking-section">
          <h2>
            {t("booking.chooseService")}
            <span className="required-marker" aria-hidden="true">
              *
            </span>
          </h2>
          <PublicServicePicker
            locale={locale}
            onToggleService={(serviceId) => {
              setSelectedServiceIds((current) =>
                current.includes(serviceId)
                  ? current.filter((id) => id !== serviceId)
                  : [...current, serviceId],
              );
              setSelectedSlot(null);
              bookingRequestKey.current = null;
            }}
            selectedServiceIds={selectedServiceIds}
            services={context.services}
            t={t}
          />
        </div>

        <div className="booking-section">
          <label htmlFor="booking-date">
            <h2>
              {t("booking.chooseDate")}
              <span className="required-marker" aria-hidden="true">
                *
              </span>
            </h2>
          </label>
          <input
            id="booking-date"
            className="date-input"
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => {
              setDate(event.target.value);
              setSelectedSlot(null);
              bookingRequestKey.current = null;
            }}
            type="date"
            value={date}
          />
          <p className="date-context" aria-live="polite">
            {availabilityForSelectedDate}
          </p>
        </div>

        <div className="booking-section">
          <h2>
            {t("booking.chooseTime")}
            <span className="required-marker" aria-hidden="true">
              *
            </span>
          </h2>
          {isLoadingSlots && (
            <p className="empty-state" role="status">
              {t("booking.loadingSlots")}
            </p>
          )}
          {!isLoadingSlots && slots.length === 0 && (
            <div className="empty-state">
              <p>{noSlotsForSelectedDate}</p>
              <button
                className="secondary-button neutral-button"
                onClick={() => setDate(getFollowingBookableDate(date))}
                type="button"
              >
                {t("booking.chooseAnotherDate")}
              </button>
            </div>
          )}
          <div className="slot-list">
            {slots.map((slot) => (
              <button
                aria-pressed={selectedSlot?.startsAt === slot.startsAt}
                className={
                  selectedSlot?.startsAt === slot.startsAt
                    ? "slot-option selected"
                    : "slot-option"
                }
                key={slot.startsAt}
                onClick={() => {
                  setSelectedSlot(slot);
                  bookingRequestKey.current = null;
                  analytics.track(analyticsEvents.bookingSlotSelected, {
                    locale,
                  });
                }}
                type="button"
              >
                {formatTime(new Date(slot.startsAt), locale)}
              </button>
            ))}
          </div>
        </div>

        <div className="booking-section details-section">
          <h2>{t("booking.yourDetails")}</h2>
          <p className="required-hint">{t("booking.requiredHint")}</p>
          <div className="form-grid">
            <label>
              <span>
                {t("booking.name")}
                <span className="required-marker" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                aria-required="true"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
            <label>
              <span>
                {t("booking.email")}{" "}
                <span className="required-marker" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                aria-required="true"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
              <span className="muted-copy">
                {t("booking.emailNotificationNotice")}
              </span>
            </label>
            <label>
              <span>
                {t("booking.phone")}{" "}
                <span className="optional-label">
                  ({t("booking.optional")})
                </span>
              </span>
              <input
                aria-label={`${t("booking.phone")} (${t("booking.optional")})`}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                value={phone}
              />
            </label>
            <label>
              <span>
                {t("booking.note")}{" "}
                <span className="optional-label">
                  ({t("booking.optional")})
                </span>
              </span>
              <textarea
                onChange={(event) => setNote(event.target.value)}
                value={note}
              />
            </label>
          </div>
        </div>

        {error && (
          <p className="error-state" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary-button confirm-button"
          disabled={isLoading || selectedServices.length === 0}
          onClick={() => void submitBooking()}
          type="button"
        >
          {isLoading ? t("common.loading") : t("booking.confirm")}
        </button>
      </section>
    </main>
  );
}

function getManagementTokenFromLocation() {
  if (typeof window === "undefined") return null;
  return (
    new URLSearchParams(window.location.hash.slice(1)).get("token")?.trim() ||
    null
  );
}

function hasManagementTokenInLocation() {
  if (getManagementTokenFromLocation()) return true;
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("token")
  );
}
