import { formatCurrency, formatDate } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";

import { AppointmentStatusBadge } from "../../components/AppointmentStatusBadge";
import { InfoCard } from "../../components/InfoCard";
import { SummaryMetrics } from "../../components/SummaryMetrics";
import type { DemoAppointment, DemoData } from "../../demo/types";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Service, Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type TodayTabProps = DashboardTabProps & {
  readonly demoData?: DemoData;
  readonly service: Service | null;
  readonly workspace: Workspace;
};

export function TodayTab({
  demoData,
  locale,
  service,
  t,
  workspace,
}: TodayTabProps) {
  const today = formatDate(new Date(), locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
  const appointments = demoData?.appointments ?? [];
  const expectedRevenue = appointments.reduce(
    (total, appointment) => total + appointment.priceAmount,
    0,
  );
  const nextAppointment = appointments[0];

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
            value: String(appointments.length),
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
        {nextAppointment ? (
          <AppointmentRow appointment={nextAppointment} t={t} />
        ) : (
          <Text style={styles.helper}>{t("mobile.noBookingsToday")}</Text>
        )}
      </InfoCard>

      {demoData && (
        <InfoCard>
          <Text style={styles.sectionTitle}>{t("mobile.todaySchedule")}</Text>
          <View style={styles.appointmentsList}>
            {appointments.map((appointment) => (
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
