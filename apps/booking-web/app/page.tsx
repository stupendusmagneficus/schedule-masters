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

import { analytics } from "../src/lib/analytics";
import {
  getFollowingBookableDate,
  getNextBookableDate,
} from "../src/utils/dates";

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
  const [context, setContext] = useState<PublicBookingContext>(demoContext);
  const [selectedServiceId, setSelectedServiceId] = useState(demoServiceId);
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
  const selectedService = context.services.find(
    (service) => service.id === selectedServiceId,
  );

  useEffect(() => {
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
      if (!supabase) return;
      const slug =
        new URLSearchParams(window.location.search).get("slug") ??
        "demo-studio";
      const { data, error: contextError } = await supabase.rpc(
        "get_public_booking_context",
        { p_slug: slug },
      );
      if (!cancelled && !contextError && data) {
        const parsed = parsePublicBookingContext(data);
        setContext(parsed);
        setSelectedServiceId(parsed.services[0]?.id ?? "");
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
      setError(null);
      setIsLoadingSlots(true);
      if (isDemoBookingPage()) {
        setSlots(getDemoSlots(date));
        setIsLoadingSlots(false);
        return;
      }
      if (!selectedServiceId) {
        setSlots([]);
        setIsLoadingSlots(false);
        return;
      }
      if (!supabase) {
        setSlots([]);
        setIsLoadingSlots(false);
        return;
      }
      const slug =
        new URLSearchParams(window.location.search).get("slug") ??
        "demo-studio";
      const { data, error: slotsError } = await supabase.rpc(
        "get_public_available_slots",
        {
          p_date: date,
          p_service_id: selectedServiceId,
          p_slug: slug,
        },
      );
      if (cancelled) return;
      if (slotsError) {
        setError(slotsError.message);
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
  }, [date, selectedServiceId, supabase]);

  async function submitBooking() {
    if (!selectedService) {
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
    setError(null);
    setIsLoading(true);
    try {
      if (isDemoBookingPage()) {
        setConfirmation({
          id: `demo-${Date.now()}`,
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
          serviceName: selectedService.name,
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
      const slug =
        new URLSearchParams(window.location.search).get("slug") ??
        "demo-studio";
      const idempotencyKey = bookingRequestKey.current ?? crypto.randomUUID();
      bookingRequestKey.current = idempotencyKey;
      analytics.track(analyticsEvents.publicBookingSubmitted, { locale });
      const { data, error: bookingError } = await supabase.rpc(
        "create_public_booking",
        {
          p_customer_note: note || undefined,
          p_email: email,
          p_idempotency_key: idempotencyKey,
          p_name: name,
          p_phone: phone,
          p_service_id: selectedService.id,
          p_slug: slug,
          p_starts_at: selectedSlot.startsAt,
        },
      );
      if (bookingError) throw new Error(bookingError.message);
      analytics.track(analyticsEvents.publicBookingSucceeded, { locale });
      setConfirmation(data as PublicBookingResult);
    } catch (submitError) {
      analytics.track(analyticsEvents.publicBookingFailed, {
        locale,
        reason: "request_failed",
      });
      setError(
        submitError instanceof Error ? submitError.message : t("common.error"),
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (confirmation) {
    return (
      <main className="booking-page page-shell">
        <section className="booking-panel confirmation-panel">
          <span className="success-mark" aria-hidden="true">
            ✓
          </span>
          <p className="eyebrow">{t("booking.confirmed")}</p>
          <h1>{context.workspace.name}</h1>
          <p className="confirmation-copy">
            {confirmation.serviceName} ·{" "}
            {formatDate(new Date(confirmation.startsAt), locale)} ·{" "}
            {formatTime(new Date(confirmation.startsAt), locale)}
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              bookingRequestKey.current = null;
              setConfirmation(null);
            }}
          >
            {t("common.cancel")}
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
          <div className="service-list">
            {context.services.map((service) => (
              <button
                className={
                  service.id === selectedServiceId
                    ? "service-option selected"
                    : "service-option"
                }
                key={service.id}
                onClick={() => setSelectedServiceId(service.id)}
                type="button"
              >
                <span>
                  <strong>{service.name}</strong>
                  <small>{service.durationMinutes} min</small>
                </span>
                <span className="service-price">
                  {formatCurrency(
                    service.priceAmount,
                    locale,
                    service.currency,
                  )}
                </span>
              </button>
            ))}
          </div>
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
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
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
              <p>{t("booking.noSlots")}</p>
              <button
                className="secondary-button"
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
                className={
                  selectedSlot?.startsAt === slot.startsAt
                    ? "slot-option selected"
                    : "slot-option"
                }
                key={slot.startsAt}
                onClick={() => {
                  setSelectedSlot(slot);
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
                <span className="optional-label">
                  ({t("booking.optional")})
                </span>
              </span>
              <input
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>
            <label>
              <span>
                {t("booking.phone")}{" "}
                <span className="optional-label">
                  ({t("booking.optional")})
                </span>
              </span>
              <input
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
          disabled={isLoading}
          onClick={() => void submitBooking()}
          type="button"
        >
          {isLoading ? t("common.loading") : t("booking.confirm")}
        </button>
      </section>
    </main>
  );
}
