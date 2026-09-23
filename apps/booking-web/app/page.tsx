"use client";

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

function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function getDemoSlots(date: string): Slot[] {
  const day = new Date(`${date}T00:00:00`);
  if (Number.isNaN(day.getTime()) || day.getDay() === 0) return [];

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

export default function HomePage() {
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    if (typeof window === "undefined") {
      return detectLocale();
    }

    return detectLocale(
      window.localStorage.getItem(localeStorageKey) ?? navigator.language,
    );
  });
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [context, setContext] = useState<PublicBookingContext>(demoContext);
  const [selectedServiceId, setSelectedServiceId] = useState(demoServiceId);
  const [date, setDate] = useState(getTomorrow);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PublicBookingResult | null>(
    null,
  );
  const bookingRequestKey = useRef<string | null>(null);
  const supabase = useMemo(() => {
    if (!isConfiguredSupabase()) return null;
    return createSupabaseClient({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      publishableKey: process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
    });
  }, []);
  const selectedService = context.services.find(
    (service) => service.id === selectedServiceId,
  );

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
      if (!selectedServiceId) {
        setSlots([]);
        return;
      }
      if (!supabase) {
        setSlots(getDemoSlots(date));
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
        return;
      }
      setSlots(
        (data ?? []).map((slot) => ({
          startsAt: slot.starts_at,
          endsAt: slot.ends_at,
        })),
      );
    }
    void loadSlots();
    return () => {
      cancelled = true;
    };
  }, [date, selectedServiceId, supabase]);

  async function submitBooking() {
    if (!selectedService || !selectedSlot || !name.trim()) {
      setError(t("booking.required"));
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      if (!supabase) {
        setConfirmation({
          id: `demo-${Date.now()}`,
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
          serviceName: selectedService.name,
          status: "pending",
        });
        return;
      }
      const slug =
        new URLSearchParams(window.location.search).get("slug") ??
        "demo-studio";
      const idempotencyKey = bookingRequestKey.current ?? crypto.randomUUID();
      bookingRequestKey.current = idempotencyKey;
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
      setConfirmation(data as PublicBookingResult);
    } catch (submitError) {
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
          <h2>{t("booking.chooseService")}</h2>
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
            <h2>{t("booking.chooseDate")}</h2>
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
          <h2>{t("booking.chooseTime")}</h2>
          {!isLoading && slots.length === 0 && (
            <p className="empty-state">{t("booking.noSlots")}</p>
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
                onClick={() => setSelectedSlot(slot)}
                type="button"
              >
                {formatTime(new Date(slot.startsAt), locale)}
              </button>
            ))}
          </div>
        </div>

        <div className="booking-section details-section">
          <h2>{t("booking.yourDetails")}</h2>
          <div className="form-grid">
            <label>
              {t("booking.name")}
              <input
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>
            <label>
              {t("booking.email")}
              <input
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>
            <label>
              {t("booking.phone")}
              <input
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                value={phone}
              />
            </label>
            <label>
              {t("booking.note")}
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
