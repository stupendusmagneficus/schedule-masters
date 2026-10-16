import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate, formatTime } from "@schedule-app/i18n";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { AppointmentStatus } from "../features/appointments/manualBooking";
import type { MasterPendingBookingRequest } from "../features/bookingRequests/bookingRequests";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "./AppointmentStatusBadge";
import { FullscreenModal } from "./FullscreenModal";
import { InfoCard } from "./InfoCard";

type BookingRequestsModalProps = {
  readonly actionError: string | null;
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onRespond: (
    appointmentId: string,
    status: AppointmentStatus,
  ) => Promise<boolean>;
  readonly onMoveToWaitingList: (appointmentId: string) => Promise<boolean>;
  readonly onRetry: () => void;
  readonly requests: readonly MasterPendingBookingRequest[];
  readonly savingRequestId: string | null;
  readonly t: (key: MessageKey) => string;
  readonly timezone: string;
  readonly visible: boolean;
};

export function BookingRequestsModal({
  actionError,
  error,
  isLoading,
  locale,
  onClose,
  onRespond,
  onMoveToWaitingList,
  onRetry,
  requests,
  savingRequestId,
  t,
  timezone,
  visible,
}: BookingRequestsModalProps) {
  const [confirmation, setConfirmation] = useState<{
    readonly appointmentId: string;
    readonly type: "decline" | "waiting-list";
  } | null>(null);

  useEffect(() => {
    if (!visible) setConfirmation(null);
  }, [visible]);

  return (
    <FullscreenModal
      closeDisabled={savingRequestId !== null}
      closeLabel={t("common.close")}
      onClose={onClose}
      title={t("mobile.bookingRequests")}
      visible={visible}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {actionError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {actionError}
          </Text>
        ) : null}
        {isLoading && requests.length === 0 ? (
          <View accessibilityLiveRegion="polite" style={styles.state}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.helper}>{t("common.loading")}</Text>
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {t("mobile.bookingRequestsLoadFailed")}
            </Text>
            <ActionButton
              label={t("common.retry")}
              onPress={onRetry}
              variant="secondary"
            />
          </View>
        ) : requests.length === 0 ? (
          <InfoCard>
            <Text style={styles.emptyTitle}>
              {t("mobile.bookingRequestsEmpty")}
            </Text>
          </InfoCard>
        ) : (
          requests.map((request) => {
            const isSaving = savingRequestId === request.id;
            const activeConfirmation =
              confirmation?.appointmentId === request.id ? confirmation : null;
            return (
              <InfoCard key={request.id} style={styles.requestCard}>
                <View style={styles.header}>
                  <View style={styles.requestCopy}>
                    <Text style={styles.customerName}>
                      {request.customer_name}
                    </Text>
                    <Text style={styles.serviceName}>
                      {request.service_name}
                    </Text>
                  </View>
                  <AppointmentStatusBadge
                    label={getAppointmentStatusLabel(request.status, t)}
                    status={request.status}
                  />
                </View>
                <View style={styles.details}>
                  <Text style={styles.detailValue}>
                    {formatDate(new Date(request.starts_at), locale, {
                      day: "numeric",
                      month: "long",
                      timeZone: timezone,
                      year: "numeric",
                    })}{" "}
                    ·{" "}
                    {formatTime(new Date(request.starts_at), locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: timezone,
                    })}
                    –
                    {formatTime(new Date(request.ends_at), locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: timezone,
                    })}
                  </Text>
                  {request.customer_phone || request.customer_email ? (
                    <Text selectable style={styles.contact}>
                      {[request.customer_phone, request.customer_email]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  ) : null}
                </View>
                {activeConfirmation ? (
                  <View style={styles.confirmation}>
                    <Text style={styles.helper}>
                      {t(
                        activeConfirmation.type === "decline"
                          ? "mobile.bookingRequestDeclinePrompt"
                          : "mobile.bookingRequestMoveToWaitingListPrompt",
                      )}
                    </Text>
                    <View style={styles.actions}>
                      <ActionButton
                        disabled={savingRequestId !== null}
                        label={t("common.cancel")}
                        onPress={() => setConfirmation(null)}
                        style={styles.actionButton}
                        variant="neutral"
                      />
                      <ActionButton
                        disabled={savingRequestId !== null}
                        label={t(
                          activeConfirmation.type === "decline"
                            ? "mobile.bookingRequestDecline"
                            : "mobile.bookingRequestMoveToWaitingListConfirm",
                        )}
                        loading={isSaving}
                        onPress={async () => {
                          const succeeded =
                            activeConfirmation.type === "decline"
                              ? await onRespond(
                                  request.id,
                                  "cancelled_by_master",
                                )
                              : await onMoveToWaitingList(request.id);
                          if (succeeded) setConfirmation(null);
                        }}
                        style={styles.actionButton}
                        variant={
                          activeConfirmation.type === "decline"
                            ? "destructive"
                            : "secondary"
                        }
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <ActionButton
                      disabled={savingRequestId !== null}
                      label={t("mobile.bookingRequestDecline")}
                      onPress={() =>
                        setConfirmation({
                          appointmentId: request.id,
                          type: "decline",
                        })
                      }
                      style={styles.actionButton}
                      variant="destructive"
                    />
                    <ActionButton
                      disabled={savingRequestId !== null}
                      label={t("mobile.bookingRequestAccept")}
                      loading={isSaving}
                      onPress={() => void onRespond(request.id, "confirmed")}
                      style={styles.actionButton}
                      variant="primary"
                    />
                  </View>
                )}
                {!activeConfirmation ? (
                  <ActionButton
                    disabled={savingRequestId !== null}
                    label={t("mobile.bookingRequestMoveToWaitingList")}
                    onPress={() =>
                      setConfirmation({
                        appointmentId: request.id,
                        type: "waiting-list",
                      })
                    }
                    style={styles.waitingListButton}
                    variant="secondary"
                  />
                ) : null}
              </InfoCard>
            );
          })
        )}
      </ScrollView>
    </FullscreenModal>
  );
}

const styles = StyleSheet.create({
  actionButton: { flex: 1 },
  actions: { flexDirection: "row", gap: 8 },
  confirmation: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
  },
  content: { gap: 8, padding: 16, paddingBottom: 32 },
  contact: { ...typography.metadata, color: colors.secondaryText },
  customerName: {
    ...typography.body,
    color: colors.primaryText,
    fontWeight: "700",
  },
  detailValue: {
    ...typography.metadata,
    color: colors.primaryText,
    fontWeight: "600",
  },
  details: { gap: 2, marginVertical: 6 },
  emptyTitle: { ...typography.body, color: colors.secondaryText },
  error: { ...typography.body, color: colors.danger, marginTop: 8 },
  header: { alignItems: "center", flexDirection: "row", gap: 8 },
  helper: { ...typography.body, color: colors.secondaryText },
  requestCopy: { flex: 1, gap: 4 },
  requestCard: { padding: 12 },
  serviceName: { ...typography.metadata, color: colors.secondaryText },
  state: { alignItems: "center", gap: 12, padding: 24 },
  waitingListButton: {
    alignSelf: "stretch",
    marginTop: 8,
    minHeight: 44,
  },
});
