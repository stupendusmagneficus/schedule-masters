import { formatCurrency, formatDate, formatTime } from "@schedule-app/i18n";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "../../components/AppointmentStatusBadge";
import { DashboardPageHeader } from "../../components/DashboardPageHeader";
import { InfoCard } from "../../components/InfoCard";
import { SummaryMetrics } from "../../components/SummaryMetrics";
import type { DemoAppointment, DemoData } from "../../demo/types";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import { formatDateInTimeZone } from "../../features/availability/personalBlocks";
import { spacing } from "../../theme/spacing";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type TodayTabProps = DashboardTabProps & {
  readonly demoData?: DemoData;
  readonly masterAppointments?: readonly MasterAppointment[];
  readonly appointmentsError?: Error | null;
  readonly appointmentsLoading?: boolean;
  readonly onRetryAppointments?: () => void;
  readonly onSelectAppointment?: (appointment: MasterAppointment) => void;
  readonly onOpenProfile: () => void;
  readonly workspace: Workspace;
};

export function TodayTab({
  demoData,
  locale,
  masterAppointments = [],
  appointmentsError = null,
  appointmentsLoading = false,
  onRetryAppointments,
  onSelectAppointment,
  onOpenProfile,
  t,
  workspace,
}: TodayTabProps) {
  const today = formatDate(new Date(), locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
  const todayInWorkspace = formatDateInTimeZone(new Date(), workspace.timezone);
  const liveAppointments = masterAppointments.filter(
    (appointment) =>
      formatDateInTimeZone(
        new Date(appointment.starts_at),
        workspace.timezone,
      ) === todayInWorkspace,
  );
  const demoAppointments = demoData?.appointments ?? [];
  const revenueAppointments = liveAppointments.filter(
    (appointment) =>
      appointment.status === "pending" ||
      appointment.status === "confirmed" ||
      appointment.status === "completed",
  );
  const visibleAppointments = liveAppointments.filter(
    (appointment) =>
      appointment.status !== "cancelled_by_customer" &&
      appointment.status !== "cancelled_by_master",
  );
  const activeAppointments = liveAppointments.filter(
    (appointment) =>
      appointment.status === "pending" || appointment.status === "confirmed",
  );
  const expectedRevenue = demoData
    ? demoAppointments.reduce(
        (total, appointment) => total + appointment.priceAmount,
        0,
      )
    : revenueAppointments.reduce(
        (total, appointment) => total + Number(appointment.price_amount),
        0,
      );
  const appointmentCount = demoData
    ? demoAppointments.length
    : visibleAppointments.length;
  const nextLiveAppointment = activeAppointments[0];

  return (
    <View style={styles.content}>
      <DashboardPageHeader
        actionLabel={t("mobile.profile")}
        onAction={onOpenProfile}
        subtitle={today}
        title={t("mobile.today")}
      />
      {demoData ? (
        <Text style={styles.demoLabel}>{t("mobile.demoMode")}</Text>
      ) : null}

      {(!appointmentsLoading && !appointmentsError) || demoData ? (
        <SummaryMetrics
          metrics={[
            {
              id: "bookings",
              label: t("mobile.bookings"),
              value: String(appointmentCount),
            },
            {
              id: "expected-revenue",
              label: t("mobile.expectedRevenue"),
              tone: "accent",
              value: formatCurrency(expectedRevenue, locale, "CZK"),
            },
          ]}
        />
      ) : null}

      {demoData && (
        <InfoCard style={styles.scheduleCard}>
          <Text style={styles.sectionTitle}>{t("mobile.todaySchedule")}</Text>
          <View style={styles.appointmentsList}>
            {demoAppointments.map((appointment, index) => (
              <AppointmentRow
                appointment={appointment}
                isNextBooking={index === 0}
                key={appointment.id}
                t={t}
              />
            ))}
          </View>
          <Text style={styles.freeSlotsLabel}>{t("mobile.freeSlots")}</Text>
          <View style={styles.freeSlots}>
            {demoData.freeSlots.map((slot) => (
              <Text key={slot} style={styles.freeSlot}>
                {slot}
              </Text>
            ))}
          </View>
        </InfoCard>
      )}

      {!demoData ? (
        <InfoCard style={styles.scheduleCard}>
          <Text style={styles.sectionTitle}>{t("mobile.todaySchedule")}</Text>
          {appointmentsLoading ? (
            <View accessibilityLiveRegion="polite" style={styles.state}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.helper}>{t("common.loading")}</Text>
            </View>
          ) : appointmentsError ? (
            <Pressable accessibilityRole="button" onPress={onRetryAppointments}>
              <Text style={styles.error}>{t("mobile.todayLoadFailed")}</Text>
              <Text style={styles.retry}>{t("mobile.todayRetry")}</Text>
            </Pressable>
          ) : liveAppointments.length ? (
            <View style={styles.appointmentsList}>
              {liveAppointments.map((appointment) => (
                <MasterAppointmentRow
                  appointment={appointment}
                  isNextBooking={appointment.id === nextLiveAppointment?.id}
                  key={appointment.id}
                  locale={locale}
                  onPress={() => onSelectAppointment?.(appointment)}
                  t={t}
                  timezone={workspace.timezone}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>{t("mobile.noBookingsToday")}</Text>
          )}
        </InfoCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.section },
  demoLabel: {
    ...typography.caption,
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    color: colors.secondaryText,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  helper: { ...typography.body, color: colors.secondaryText },
  error: { ...typography.body, color: colors.danger },
  retry: { ...typography.label, color: colors.accent, marginTop: 6 },
  state: { alignItems: "center", flexDirection: "row", gap: 10 },
  nextLabel: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  sectionTitle: {
    color: colors.primaryText,
    marginBottom: 10,
    ...typography.section,
  },
  serviceName: {
    ...typography.body,
    color: colors.primaryText,
    fontWeight: "600",
  },
  appointmentsList: { gap: 12 },
  scheduleCard: { marginTop: 8 },
  appointmentDetails: { flex: 1, gap: 2 },
  appointmentRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "700",
  },
  freeSlot: {
    ...typography.label,
    backgroundColor: colors.subtleSurface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.primaryText,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  freeSlots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  freeSlotsLabel: {
    ...typography.caption,
    color: colors.secondaryText,
    marginBottom: 8,
    marginTop: 16,
  },
});

function AppointmentRow({
  appointment,
  isNextBooking = false,
  t,
}: {
  readonly appointment: DemoAppointment;
  readonly isNextBooking?: boolean;
  readonly t: TodayTabProps["t"];
}) {
  const statusLabel =
    appointment.status === "confirmed"
      ? t("mobile.confirmed")
      : t("mobile.pending");

  return (
    <View style={styles.appointmentRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{appointment.initials}</Text>
      </View>
      <View style={styles.appointmentDetails}>
        {isNextBooking ? (
          <Text style={styles.nextLabel}>{t("mobile.nextBooking")}</Text>
        ) : null}
        <Text style={styles.serviceName}>{appointment.clientName}</Text>
        <Text style={styles.helper}>
          {appointment.startsAt} · {appointment.serviceName} ·{" "}
          {appointment.durationMinutes} min
        </Text>
      </View>
      <AppointmentStatusBadge label={statusLabel} status={appointment.status} />
    </View>
  );
}

function MasterAppointmentRow({
  appointment,
  isNextBooking = false,
  locale,
  onPress,
  t,
  timezone,
}: {
  readonly appointment: MasterAppointment;
  readonly isNextBooking?: boolean;
  readonly locale: TodayTabProps["locale"];
  readonly onPress?: () => void;
  readonly t: TodayTabProps["t"];
  readonly timezone: string;
}) {
  const status = appointment.status;
  const statusLabel = getAppointmentStatusLabel(status, t);
  const initials = appointment.customer_name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const content = (
    <View style={styles.appointmentRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.appointmentDetails}>
        {isNextBooking ? (
          <Text style={styles.nextLabel}>{t("mobile.nextBooking")}</Text>
        ) : null}
        <Text style={styles.serviceName}>{appointment.customer_name}</Text>
        <Text style={styles.helper}>
          {formatTime(new Date(appointment.starts_at), locale, {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone,
          })}{" "}
          · {appointment.service_name} · {appointment.duration_minutes} min
        </Text>
      </View>
      <AppointmentStatusBadge label={statusLabel} status={status} />
    </View>
  );

  return onPress ? (
    <Pressable
      accessibilityLabel={`${appointment.customer_name}, ${statusLabel}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}
