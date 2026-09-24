import { formatDate } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../components/InfoCard";
import type { DemoData } from "../../demo/types";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { DashboardTabProps } from "./types";

export function CalendarTab({
  demoData,
  locale,
  t,
}: DashboardTabProps & { readonly demoData?: DemoData }) {
  const today = formatDate(new Date(), locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  return (
    <View style={styles.content}>
      <View>
        <Text style={styles.eyebrow}>{t("mobile.calendar")}</Text>
        <Text style={styles.title}>{today}</Text>
      </View>
      <InfoCard>
        <Text style={styles.sectionTitle}>{t("mobile.workingHours")}</Text>
        <Text style={styles.hours}>08:00 – 21:00</Text>
      </InfoCard>
      <InfoCard>
        <Text style={styles.sectionTitle}>{t("mobile.nextBooking")}</Text>
        {demoData ? (
          <View style={styles.timeline}>
            {demoData.appointments.map((appointment) => (
              <View key={appointment.id} style={styles.timelineRow}>
                <Text style={styles.time}>{appointment.startsAt}</Text>
                <View style={styles.event}>
                  <Text style={styles.eventTitle}>
                    {appointment.clientName}
                  </Text>
                  <Text style={styles.helper}>
                    {appointment.serviceName} · {appointment.durationMinutes}{" "}
                    min
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.helper}>{t("mobile.noBookingsToday")}</Text>
        )}
      </InfoCard>
      {demoData && (
        <InfoCard>
          <Text style={styles.sectionTitle}>{t("mobile.freeSlots")}</Text>
          <Text style={styles.helper}>{demoData.freeSlots.join(" · ")}</Text>
        </InfoCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  eyebrow: {
    color: colors.accent,
    marginBottom: 6,
    textTransform: "uppercase",
    ...typography.eyebrow,
  },
  helper: { ...typography.body, color: colors.secondaryText },
  hours: { ...typography.metric, color: colors.primaryText },
  event: {
    backgroundColor: colors.accentSoft,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    borderRadius: radii.control,
    flex: 1,
    padding: 10,
  },
  eventTitle: { ...typography.label, color: colors.primaryText },
  sectionTitle: {
    color: colors.primaryText,
    marginBottom: 10,
    ...typography.section,
  },
  title: { ...typography.heading, color: colors.primaryText },
  time: { ...typography.caption, color: colors.secondaryText, width: 48 },
  timeline: { gap: 8 },
  timelineRow: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
});
