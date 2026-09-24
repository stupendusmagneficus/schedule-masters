import { formatDate } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../components/InfoCard";
import { colors } from "../../theme/tokens";
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
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  helper: { color: colors.secondaryText, fontSize: 14, lineHeight: 20 },
  hours: { color: colors.primaryText, fontSize: 24, fontWeight: "700" },
  sectionTitle: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  title: { color: colors.primaryText, fontSize: 28, fontWeight: "700" },
});
