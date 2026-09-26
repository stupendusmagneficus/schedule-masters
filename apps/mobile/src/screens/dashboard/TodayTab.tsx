import { formatCurrency, formatDate, formatTime } from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "../../components/AppointmentStatusBadge";
import { InfoCard } from "../../components/InfoCard";
import { SummaryMetrics } from "../../components/SummaryMetrics";
import type { DemoAppointment, DemoData } from "../../demo/types";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import { formatDateInTimeZone } from "../../features/availability/personalBlocks";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Service, Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type TodayTabProps = DashboardTabProps & {
  readonly demoData?: DemoData;
  readonly masterAppointments?: readonly MasterAppointment[];
  readonly onSelectAppointment?: (appointment: MasterAppointment) => void;
  readonly service: Service | null;
  readonly workspace: Workspace;
};

export function TodayTab({
  demoData,
  locale,
  masterAppointments = [],
  onSelectAppointment,
  service,
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
  const nextDemoAppointment = demoAppointments[0];
  const nextLiveAppointment = activeAppointments[0];

  return (
    <View style={styles.content}>
      <View>
        <Text style={styles.eyebrow}>{t("mobile.today")}</Text>
        <Text style={styles.title}>{workspace.name}</Text>
        <Text style={styles.date}>{today}</Text>
        {demoData && (
          <Text style={styles.demoLabel}>{t("mobile.demoMode")}</Text>
        )}
      </View>

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

      <InfoCard>
        <Text style={styles.sectionTitle}>{t("mobile.nextBooking")}</Text>
        {nextDemoAppointment ? (
          <AppointmentRow appointment={nextDemoAppointment} t={t} />
        ) : nextLiveAppointment ? (
          <MasterAppointmentRow
            appointment={nextLiveAppointment}
            locale={locale}
            onPress={() => onSelectAppointment?.(nextLiveAppointment)}
            t={t}
            timezone={workspace.timezone}
          />
        ) : (
          <Text style={styles.helper}>{t("mobile.noBookingsToday")}</Text>
        )}
      </InfoCard>

      {demoData && (
        <InfoCard>
          <Text style={styles.sectionTitle}>{t("mobile.todaySchedule")}</Text>
          <View style={styles.appointmentsList}>
            {demoAppointments.map((appointment) => (
              <AppointmentRow
                appointment={appointment}
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
        <InfoCard>
          <Text style={styles.sectionTitle}>{t("mobile.todaySchedule")}</Text>
          {liveAppointments.length ? (
            <View style={styles.appointmentsList}>
              {liveAppointments.map((appointment) => (
                <MasterAppointmentRow
                  appointment={appointment}
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

      <InfoCard>
        <Text style={styles.sectionTitle}>{t("mobile.firstService")}</Text>
        {service ? (
          <View style={styles.serviceRow}>
            <View>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.helper}>{service.duration_minutes} min</Text>
            </View>
            <Text style={styles.price}>
              {formatCurrency(Number(service.price_amount), locale, "CZK")}
            </Text>
          </View>
        ) : (
          <Text style={styles.helper}>{t("mobile.noServices")}</Text>
        )}
      </InfoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
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
  date: { ...typography.metadata, color: colors.secondaryText, marginTop: 4 },
  eyebrow: {
    color: colors.accent,
    marginBottom: 6,
    textTransform: "uppercase",
    ...typography.eyebrow,
  },
  helper: { ...typography.body, color: colors.secondaryText },
  price: { ...typography.label, color: colors.accent },
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
  serviceRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  appointmentsList: { gap: 12 },
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
  title: { ...typography.heading, color: colors.primaryText },
});

function AppointmentRow({
  appointment,
  t,
}: {
  readonly appointment: DemoAppointment;
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
  locale,
  onPress,
  t,
  timezone,
}: {
  readonly appointment: MasterAppointment;
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
