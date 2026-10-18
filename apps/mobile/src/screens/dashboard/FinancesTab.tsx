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
import { ActionButton } from "../../components/ActionButton";
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
  const [showDetails, setShowDetails] = useState(false);
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
          <ActionButton
            label={t("mobile.financeRetry")}
            onPress={() => void financeData.reload()}
            size="compact"
            style={styles.retryButton}
            variant="quiet"
          />
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
              <View style={styles.receivedSummary}>
                <Text style={styles.incomeLabel}>
                  {t("mobile.financeActual")}
                </Text>
                <Text style={styles.amount} numberOfLines={2}>
                  {receivedAmounts}
                </Text>
                <Text style={styles.helper}>
                  {t("mobile.financeActualDescription")}
                </Text>
              </View>
              <View style={styles.secondaryMetrics}>
                <View style={styles.secondaryMetric}>
                  <Text style={styles.incomeLabel}>
                    {t("mobile.financeExpected")}
                  </Text>
                  <Text style={styles.secondaryAmount} numberOfLines={2}>
                    {expectedAmounts}
                  </Text>
                  <Text style={styles.helper}>
                    {t("mobile.financeExpectedDescription")}
                  </Text>
                </View>
                <View style={styles.secondaryMetric}>
                  <Text style={styles.incomeLabel}>
                    {t("mobile.financeCompletedAppointments")}
                  </Text>
                  <Text style={styles.secondaryAmount}>
                    {summary.completedCount}
                  </Text>
                </View>
              </View>
            </InfoCard>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showDetails }}
              onPress={() => setShowDetails((current) => !current)}
              style={({ pressed }) => [
                styles.detailsToggle,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.detailsToggleLabel}>
                {t(
                  showDetails
                    ? "mobile.financeHideDetails"
                    : "mobile.financeShowDetails",
                )}
              </Text>
              <MaterialCommunityIcons
                color={colors.accent}
                name={showDetails ? "chevron-up" : "chevron-down"}
                size={22}
              />
            </Pressable>

            {showDetails ? (
              <View style={styles.metricsGrid}>
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
            ) : null}
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
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
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
  amount: { ...typography.display, color: colors.primaryText, marginTop: 4 },
  content: {
    gap: spacing.section,
  },
  detailsToggle: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  detailsToggleLabel: {
    ...typography.label,
    color: colors.accent,
  },
  hidden: { display: "none" },
  helper: { ...typography.caption, color: colors.secondaryText, marginTop: 4 },
  incomeLabel: { ...typography.caption, color: colors.secondaryText },
  metricCard: {
    backgroundColor: colors.subtleSurface,
    borderRadius: 8,
    flexBasis: "45%",
    flexGrow: 1,
    gap: 4,
    minWidth: 0,
    padding: 12,
  },
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
  receivedSummary: { gap: 2 },
  pressed: { opacity: 0.75 },
  retryButton: { alignSelf: "flex-start", marginLeft: -10, marginTop: 4 },
  secondaryAmount: {
    ...typography.metric,
    color: colors.primaryText,
    marginTop: 4,
  },
  secondaryMetric: { flex: 1, minWidth: 0 },
  secondaryMetrics: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.section,
    paddingTop: spacing.section,
  },
  state: { alignItems: "center", gap: 8, paddingVertical: 28 },
  summaryCard: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
});
