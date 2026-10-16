"use client";

import type { SupabaseDatabaseClient } from "@schedule-app/api";
import {
  createTranslator,
  formatDate,
  formatTime,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useEffect, useMemo, useState } from "react";

type AppointmentDetails = {
  readonly appointmentId: string;
  readonly canCancel: boolean;
  readonly canConfirm: boolean;
  readonly endsAt: string;
  readonly serviceName: string;
  readonly startsAt: string;
  readonly status: string;
  readonly timezone: string;
  readonly workspaceName: string;
};

type Props = {
  readonly client: SupabaseDatabaseClient;
  readonly locale: SupportedLocale;
  readonly token: string;
};

export function CustomerAppointmentPage({ client, locale, token }: Props) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await client.rpc("get_customer_appointment", {
        p_token: token,
      });
      if (cancelled) return;
      if (error || !isAppointmentDetails(data)) {
        setHasError(true);
      } else {
        setAppointment(data);
        setHasError(false);
      }
      setIsLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [client, token]);

  async function updateAppointment(action: "confirm" | "cancel") {
    setIsSaving(true);
    setHasError(false);
    const { data, error } = await client.rpc("update_customer_appointment", {
      p_action: action,
      p_token: token,
    });
    if (error) {
      setHasError(true);
      setIsSaving(false);
      return;
    }
    const result = data as { status?: unknown } | null;
    if (!result || typeof result.status !== "string") {
      setHasError(true);
    } else {
      setAppointment((current) =>
        current
          ? {
              ...current,
              canCancel: result.status === "confirmed",
              canConfirm: false,
              status: result.status as string,
            }
          : current,
      );
    }
    setIsSaving(false);
  }

  if (isLoading) {
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

  if (!appointment) {
    return (
      <main className="booking-page page-shell">
        <section className="booking-panel confirmation-panel">
          <p className="eyebrow">{t("common.appName")}</p>
          <h1>{t("booking.manageUnavailableTitle")}</h1>
          <p className="muted-copy">{t("booking.manageUnavailable")}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="booking-page page-shell">
      <section className="booking-panel confirmation-panel">
        <p className="eyebrow">{t("common.appName")}</p>
        <h1>{appointment.workspaceName}</h1>
        <p className="muted-copy">{t("booking.manageDescription")}</p>
        <div className="appointment-summary">
          <p>
            <strong>{appointment.serviceName}</strong>
          </p>
          <p>
            {formatDate(new Date(appointment.startsAt), locale, {
              day: "numeric",
              month: "long",
              timeZone: appointment.timezone,
              year: "numeric",
            })}
          </p>
          <p>
            {formatTime(new Date(appointment.startsAt), locale, {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: appointment.timezone,
            })}
            {" – "}
            {formatTime(new Date(appointment.endsAt), locale, {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: appointment.timezone,
            })}
          </p>
          <p>{getStatusLabel(appointment.status, t)}</p>
        </div>
        {appointment.canConfirm || appointment.canCancel ? (
          <div className="management-actions">
            {appointment.canConfirm ? (
              <button
                className="primary-button"
                disabled={isSaving}
                onClick={() => void updateAppointment("confirm")}
                type="button"
              >
                {t("booking.manageConfirm")}
              </button>
            ) : null}
            {appointment.canCancel ? (
              <button
                className="secondary-button danger-button"
                disabled={isSaving}
                onClick={() => void updateAppointment("cancel")}
                type="button"
              >
                {t("booking.manageCancel")}
              </button>
            ) : null}
          </div>
        ) : null}
        {hasError ? (
          <p className="error-state" role="alert">
            {t("booking.manageActionFailed")}
          </p>
        ) : null}
      </section>
    </main>
  );
}

function isAppointmentDetails(value: unknown): value is AppointmentDetails {
  if (!value || typeof value !== "object") return false;
  const details = value as Partial<AppointmentDetails>;
  return (
    typeof details.appointmentId === "string" &&
    typeof details.canCancel === "boolean" &&
    typeof details.canConfirm === "boolean" &&
    typeof details.endsAt === "string" &&
    typeof details.serviceName === "string" &&
    typeof details.startsAt === "string" &&
    typeof details.status === "string" &&
    typeof details.timezone === "string" &&
    typeof details.workspaceName === "string"
  );
}

function getStatusLabel(
  status: string,
  t: ReturnType<typeof createTranslator>,
) {
  if (status === "pending") return t("booking.managePending");
  if (status === "confirmed") return t("booking.manageConfirmed");
  if (status === "cancelled_by_customer" || status === "cancelled_by_master") {
    return t("booking.manageCancelled");
  }
  if (status === "completed") return t("booking.manageCompleted");
  return t("booking.manageUnavailableTitle");
}
