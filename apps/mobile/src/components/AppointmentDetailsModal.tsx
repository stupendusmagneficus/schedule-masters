import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatCurrency, formatDate, formatTime } from "@schedule-app/i18n";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type {
  AppointmentStatus,
  MasterAppointment,
} from "../features/appointments/manualBooking";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "./AppointmentStatusBadge";
import { FullscreenModal } from "./FullscreenModal";
import { InfoCard } from "./InfoCard";

type AppointmentDetailsModalProps = {
  readonly appointment: MasterAppointment | null;
  readonly error: string | null;
  readonly isSaving: boolean;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onStatusChange: (status: AppointmentStatus) => Promise<void>;
  readonly t: (key: MessageKey) => string;
  readonly timezone: string;
  readonly visible: boolean;
};

export function AppointmentDetailsModal({
  appointment,
  error,
  isSaving,
  locale,
  onClose,
  onStatusChange,
  t,
  timezone,
  visible,
}: AppointmentDetailsModalProps) {
  const actions = appointment ? getStatusActions(appointment.status, t) : [];

  return (
    <FullscreenModal
      closeDisabled={isSaving}
      closeLabel={t("common.cancel")}
      onClose={onClose}
      title={t("mobile.appointmentDetails")}
      visible={visible}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {appointment ? (
          <>
            <InfoCard>
              <View style={styles.header}>
                <View style={styles.headerCopy}>
                  <Text style={styles.customerName}>
                    {appointment.customer_name}
                  </Text>
                  <Text style={styles.serviceName}>
                    {appointment.service_name}
                  </Text>
                </View>
                <AppointmentStatusBadge
                  label={getAppointmentStatusLabel(appointment.status, t)}
                  status={appointment.status}
                />
              </View>
              <View style={styles.details}>
                <DetailRow
                  label={t("mobile.appointmentDate")}
                  value={formatDate(new Date(appointment.starts_at), locale, {
                    day: "numeric",
                    month: "long",
                    timeZone: timezone,
                    year: "numeric",
                  })}
                />
                <DetailRow
                  label={t("mobile.appointmentTime")}
                  value={`${formatTime(
                    new Date(appointment.starts_at),
                    locale,
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: timezone,
                    },
                  )} – ${formatTime(new Date(appointment.ends_at), locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: timezone,
                  })}`}
                />
                <DetailRow
                  label={t("mobile.appointmentService")}
                  value={`${appointment.service_name} · ${appointment.duration_minutes} min`}
                />
                <DetailRow
                  label={t("mobile.appointmentPrice")}
                  value={formatCurrency(
                    Number(appointment.price_amount),
                    locale,
                    appointment.currency.trim(),
                  )}
                />
              </View>
            </InfoCard>

            <InfoCard>
              <Text style={styles.sectionTitle}>
                {t("mobile.appointmentStatus")}
              </Text>
              {actions.length ? (
                <View style={styles.actions}>
                  {actions.map((action) => (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSaving}
                      key={action.status}
                      onPress={() => void onStatusChange(action.status)}
                      style={({ pressed }) => [
                        styles.action,
                        action.destructive && styles.destructiveAction,
                        isSaving && styles.disabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionText,
                          action.destructive && styles.destructiveActionText,
                        ]}
                      >
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.helper}>{t("mobile.noStatusActions")}</Text>
              )}
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}
            </InfoCard>
          </>
        ) : null}
      </ScrollView>
    </FullscreenModal>
  );
}

function DetailRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function getStatusActions(
  status: AppointmentStatus,
  t: AppointmentDetailsModalProps["t"],
): readonly {
  readonly destructive?: boolean;
  readonly label: string;
  readonly status: AppointmentStatus;
}[] {
  switch (status) {
    case "pending":
      return [
        { label: t("mobile.confirmBooking"), status: "confirmed" },
        {
          destructive: true,
          label: t("mobile.cancelBooking"),
          status: "cancelled_by_master",
        },
      ];
    case "confirmed":
      return [
        { label: t("mobile.completeBooking"), status: "completed" },
        { label: t("mobile.markNoShow"), status: "no_show" },
        {
          destructive: true,
          label: t("mobile.cancelBooking"),
          status: "cancelled_by_master",
        },
      ];
    case "cancelled_by_customer":
    case "cancelled_by_master":
    case "completed":
    case "no_show":
      return [];
  }
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  actionText: {
    ...typography.label,
    color: colors.actionText,
    fontWeight: "700",
  },
  actions: { gap: 10 },
  content: { gap: 16, padding: 16, paddingBottom: 32 },
  customerName: { ...typography.heading, color: colors.primaryText },
  destructiveAction: { backgroundColor: colors.dangerSoft },
  destructiveActionText: { color: colors.danger },
  detailLabel: { ...typography.caption, color: colors.secondaryText },
  detailRow: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingVertical: 10,
  },
  detailValue: { ...typography.body, color: colors.primaryText },
  details: { marginTop: 12 },
  disabled: { opacity: 0.6 },
  error: { ...typography.caption, color: colors.danger, marginTop: 12 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  headerCopy: { flex: 1, gap: 4 },
  helper: { ...typography.body, color: colors.secondaryText },
  pressed: { opacity: 0.82 },
  sectionTitle: {
    ...typography.section,
    color: colors.primaryText,
    marginBottom: 12,
  },
  serviceName: { ...typography.body, color: colors.secondaryText },
});
