import { formatCurrency, formatDate } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "../../components/InfoCard";
import { colors } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Service, Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type TodayTabProps = DashboardTabProps & {
  readonly service: Service | null;
  readonly workspace: Workspace;
};

export function TodayTab({ locale, service, t, workspace }: TodayTabProps) {
  const today = formatDate(new Date(), locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  return (
    <View style={styles.content}>
      <View>
        <Text style={styles.eyebrow}>{t("mobile.today")}</Text>
        <Text style={styles.title}>{workspace.name}</Text>
        <Text style={styles.date}>{today}</Text>
      </View>

      <View style={styles.summaryGrid}>
        <InfoCard style={styles.statCard}>
          <Text style={styles.statLabel}>{t("mobile.bookings")}</Text>
          <Text style={styles.statValue}>0</Text>
        </InfoCard>
        <InfoCard style={styles.statCard}>
          <Text style={styles.statLabel}>{t("mobile.expectedRevenue")}</Text>
          <Text style={styles.statValue}>0 Kč</Text>
        </InfoCard>
      </View>

      <InfoCard>
        <Text style={styles.sectionTitle}>{t("mobile.nextBooking")}</Text>
        <Text style={styles.helper}>{t("mobile.noBookingsToday")}</Text>
      </InfoCard>

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
  statLabel: { ...typography.caption, color: colors.secondaryText },
  statCard: { flex: 1 },
  statValue: {
    marginTop: 8,
    ...typography.metric,
    color: colors.primaryText,
  },
  summaryGrid: { flexDirection: "row", gap: 12 },
  title: { ...typography.heading, color: colors.primaryText },
});
