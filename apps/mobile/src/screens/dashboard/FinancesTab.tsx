import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { Database } from "@schedule-app/api";
import {
  formatCurrency,
  formatDate,
  type SupportedLocale,
} from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DashboardPageHeader } from "../../components/DashboardPageHeader";
import { InfoCard } from "../../components/InfoCard";
import type { DemoData } from "../../demo/types";
import { formatDateInTimeZone } from "../../features/availability/personalBlocks";
import {
  getTodayCalendarDate,
  moveCalendarDate,
} from "../../features/calendar/calendar";
import { summarizeFinanceMonth } from "../../features/finance/financeSummary";
import { useFinanceData } from "../../features/finance/useFinanceData";
import { spacing } from "../../theme/spacing";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type FinancesTabProps = DashboardTabProps & {
  readonly client: SupabaseClient<Database> | null;
  readonly demoData?: DemoData;
  readonly refreshVersion: number;
  readonly visible: boolean;
  readonly workspace: Workspace;
};

export function FinancesTab({
  client,
  demoData,
  locale,
  refreshVersion,
  t,
  visible,
  workspace,
}: FinancesTabProps) {
  const [month, setMonth] = useState(() => {
    const today = getTodayCalendarDate(workspace.timezone);
    return `${today.slice(0, 7)}-01`;
  });
  const financeData = useFinanceData({
    client,
    demoData,
    enabled: visible,
    month,
    refreshVersion,
    timezone: workspace.timezone,
    workspaceId: workspace.id,
  });
  const now = new Date();
  const summary = summarizeFinanceMonth({
    appointments: financeData.appointments,
    month,
    now,
    timezone: workspace.timezone,
  });
  const monthLabel = formatDate(new Date(`${month}T12:00:00.000Z`), locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const expectedAmounts = formatAmounts(summary.expectedByCurrency, locale);
  const receivedAmounts = formatAmounts(summary.paidByCurrency, locale);
  const hasAppointments = financeData.appointments.some((appointment) => {
    return formatDateInTimeZone(
      new Date(appointment.starts_at),
      workspace.timezone,
    ).startsWith(month.slice(0, 7));
  });

  return (
    <View style={[styles.content, !visible && styles.hidden]}>
      <DashboardPageHeader
        subtitle={t("mobile.financeSummaryTitle")}
        title={t("mobile.finances")}
      />

      <View style={styles.monthSelector}>
        <MonthButton
          accessibilityLabel={t("mobile.financePreviousMonth")}
          icon="chevron-left"
          onPress={() =>
            setMonth((current) => moveCalendarDate(current, "month", -1))
          }
        />
        <Text accessibilityRole="header" style={styles.monthLabel}>
          {monthLabel}
        </Text>
        <MonthButton
          accessibilityLabel={t("mobile.financeNextMonth")}
          icon="chevron-right"
          onPress={() =>
            setMonth((current) => moveCalendarDate(current, "month", 1))
          }
        />
      </View>

      {financeData.isLoading ? (
        <View accessibilityLiveRegion="polite" style={styles.state}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.helper}>{t("common.loading")}</Text>
        </View>
      ) : null}

      {financeData.error ? (
        <InfoCard>
          <Text style={styles.helper}>{t("mobile.financeLoadFailed")}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void financeData.reload()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>{t("mobile.financeRetry")}</Text>
          </Pressable>
        </InfoCard>
      ) : null}

      {!financeData.isLoading && !financeData.error ? (
        !hasAppointments ? (
          <InfoCard>
            <Text style={styles.helper}>{t("mobile.financeEmpty")}</Text>
          </InfoCard>
        ) : (
          <>
            <InfoCard style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>
                {t("mobile.financeIncome")}
              </Text>
              <View style={styles.incomeRow}>
                <View style={styles.incomeColumn}>
                  <View style={styles.incomeLabelRow}>
                    <View style={[styles.statusDot, styles.completedDot]} />
                    <Text style={styles.incomeLabel}>
                      {t("mobile.financeActual")}
                    </Text>
                  </View>
                  <Text style={styles.amount} numberOfLines={2}>
                    {receivedAmounts}
                  </Text>
                  <Text style={styles.helper}>
                    {t("mobile.financeActualDescription")}
                  </Text>
                </View>
                <View style={styles.incomeColumn}>
                  <View style={styles.incomeLabelRow}>
                    <View style={[styles.statusDot, styles.expectedDot]} />
                    <Text style={styles.incomeLabel}>
                      {t("mobile.financeExpected")}
                    </Text>
                  </View>
                  <Text style={styles.amount} numberOfLines={2}>
                    {expectedAmounts}
                  </Text>
                  <Text style={styles.helper}>
                    {t("mobile.financeExpectedDescription")}
                  </Text>
                </View>
              </View>
            </InfoCard>

            <InfoCard style={styles.appointmentsCard}>
              <Text style={styles.sectionTitle}>
                {t("mobile.financeAppointments")}
              </Text>
              <View style={styles.metricsGrid}>
                <MetricCard
                  label={t("mobile.financeCompletedAppointments")}
                  value={String(summary.completedCount)}
                />
                <MetricCard
                  label={t("mobile.financeUpcomingAppointments")}
                  value={String(summary.upcomingCount)}
                />
                <MetricCard
                  label={t("mobile.financeCanceledAppointments")}
                  value={String(summary.canceledCount)}
                />
                <MetricCard
                  label={t("mobile.financeNoShowAppointments")}
                  value={String(summary.noShowCount)}
                />
                <MetricCard
                  label={t("mobile.financeNewCustomers")}
                  value={String(summary.newCustomerCount)}
                />
                <MetricCard
                  label={t("mobile.financeReturningCustomers")}
                  value={String(summary.returningCustomerCount)}
                />
                <MetricCard
                  label={t("mobile.financeBookedHours")}
                  value={String(
                    Math.round((summary.bookedMinutes / 60) * 10) / 10,
                  )}
                />
              </View>
            </InfoCard>
            <View style={styles.notice}>
              <MaterialCommunityIcons
                color={colors.secondaryText}
                name="information-outline"
                size={18}
              />
              <Text style={styles.noticeText}>
                {t("mobile.financeProfitUnavailable")}
              </Text>
            </View>
          </>
        )
      ) : null}
    </View>
  );
}

function MonthButton({
  accessibilityLabel,
  icon,
  onPress,
}: {
  readonly accessibilityLabel: string;
  readonly icon: "chevron-left" | "chevron-right";
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons
        color={colors.primaryText}
        name={icon}
        size={24}
      />
    </Pressable>
  );
}

function MetricCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <InfoCard style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </InfoCard>
  );
}

function formatAmounts(
  amounts: Readonly<Record<string, number>>,
  locale: SupportedLocale,
): string {
  const entries = Object.entries(amounts);
  if (entries.length === 0) return "—";
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => formatCurrency(amount, locale, currency))
    .join(" · ");
}

const styles = StyleSheet.create({
  amount: { ...typography.metric, color: colors.primaryText, marginTop: 8 },
  appointmentsCard: { gap: 12 },
  completedDot: { backgroundColor: colors.accent },
  content: {
    gap: spacing.section,
  },
  hidden: { display: "none" },
  expectedDot: { backgroundColor: colors.primaryText },
  helper: { ...typography.caption, color: colors.secondaryText, marginTop: 4 },
  incomeColumn: { flex: 1, minWidth: 0 },
  incomeLabel: { ...typography.caption, color: colors.secondaryText },
  incomeLabelRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  incomeRow: {
    flexDirection: "row",
    gap: spacing.section,
    marginTop: spacing.section,
  },
  metricCard: { flexBasis: "45%", flexGrow: 1, gap: 4, minWidth: 0 },
  metricLabel: { ...typography.caption, color: colors.secondaryText },
  metricValue: { ...typography.label, color: colors.primaryText },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  monthButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  monthLabel: {
    ...typography.label,
    color: colors.primaryText,
    flex: 1,
    textAlign: "center",
    textTransform: "capitalize",
  },
  monthSelector: { alignItems: "center", flexDirection: "row", gap: 12 },
  notice: {
    alignItems: "flex-start",
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.surface,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  noticeText: { ...typography.caption, color: colors.secondaryText, flex: 1 },
  pressed: { opacity: 0.75 },
  retryButton: { alignSelf: "flex-start", marginTop: 12 },
  retryText: { ...typography.label, color: colors.accentPressed },
  state: { alignItems: "center", gap: 8, paddingVertical: 28 },
  summaryCard: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
  sectionTitle: { ...typography.label, color: colors.primaryText },
  statusDot: { borderRadius: 4, height: 8, width: 8 },
});
