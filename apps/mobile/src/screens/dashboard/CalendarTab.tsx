import { formatDate } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../components/InfoCard";
import { colors } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { DashboardTabProps } from "./types";

export function CalendarTab({ locale, t }: DashboardTabProps) {
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
        <Text style={styles.helper}>{t("mobile.noBookingsToday")}</Text>
      </InfoCard>
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
  sectionTitle: {
    color: colors.primaryText,
    marginBottom: 10,
    ...typography.section,
  },
  title: { ...typography.heading, color: colors.primaryText },
});
