import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { Database } from "@schedule-app/api";
import {
  formatCurrency,
  formatDate,
  type MessageKey,
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
import { DateTimePickerField } from "../../components/DateTimePickerField";
import { DashboardPageHeader } from "../../components/DashboardPageHeader";
import { InfoCard } from "../../components/InfoCard";
import type { DemoData } from "../../demo/types";
import { formatDateInTimeZone } from "../../features/availability/personalBlocks";
import {
  addCalendarDays,
  getCalendarDateRange,
  getTodayCalendarDate,
  moveCalendarDate,
} from "../../features/calendar/calendar";
import { summarizeFinanceRange } from "../../features/finance/financeSummary";
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
  const [customRange, setCustomRange] = useState(false);
  const [customFromDate, setCustomFromDate] = useState(() =>
    monthBoundary(month, false),
  );
  const [customToDate, setCustomToDate] = useState(() =>
    monthBoundary(month, true),
  );
  const fromDate = customRange ? customFromDate : monthBoundary(month, false);
  const toDate = customRange ? customToDate : monthBoundary(month, true);
  const [showDetails, setShowDetails] = useState(false);
  const financeData = useFinanceData({
    client,
    demoData,
    enabled: visible,
    fromDate,
    refreshVersion,
    toDate,
    timezone: workspace.timezone,
    workspaceId: workspace.id,
  });
  const now = new Date();
  const summary = summarizeFinanceRange({
    appointments: financeData.appointments,
    fromDate,
    now,
    toDate,
    timezone: workspace.timezone,
  });
  const monthLabel = formatDate(new Date(`${month}T12:00:00.000Z`), locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const expectedAmounts = formatAmounts(summary.expectedByCurrency, locale);
  const receivedAmounts = formatAmounts(summary.paidByCurrency, locale);
  const weeklyIncome = summarizeWeeklyIncome(
    financeData.appointments,
    fromDate,
    toDate,
    locale,
    workspace.timezone,
  );
  const hasAppointments = financeData.appointments.some((appointment) => {
    const localDate = formatDateInTimeZone(
      new Date(appointment.starts_at),
      workspace.timezone,
    );
    return localDate >= fromDate && localDate <= toDate;
  });

  return (
    <View style={[styles.content, !visible && styles.hidden]}>
      <DashboardPageHeader
        subtitle={t("mobile.financeSummaryTitle")}
        title={t("mobile.finances")}
      />

      <View style={styles.periodMode}>
        <PeriodModeButton
          label={t("mobile.financeMonthlyRange")}
          onPress={() => setCustomRange(false)}
          selected={!customRange}
        />
        <PeriodModeButton
          label={t("mobile.financeCustomRange")}
          onPress={() => {
            if (!customRange) {
              setCustomFromDate(monthBoundary(month, false));
              setCustomToDate(monthBoundary(month, true));
            }
            setCustomRange(true);
          }}
          selected={customRange}
        />
      </View>

      {customRange ? (
        <View style={styles.rangeFields}>
          <DateTimePickerField
            label={t("mobile.financeFromDate")}
            locale={locale}
            mode="date"
            onChange={(value) => {
              setCustomFromDate(value);
              if (value > customToDate) setCustomToDate(value);
            }}
            placeholder={t("mobile.datePickerChoose")}
            t={t}
            value={customFromDate}
          />
          <DateTimePickerField
            label={t("mobile.financeToDate")}
            locale={locale}
            mode="date"
            onChange={(value) => {
              setCustomToDate(value);
              if (value < customFromDate) setCustomFromDate(value);
            }}
            placeholder={t("mobile.datePickerChoose")}
            t={t}
            value={customToDate}
          />
        </View>
      ) : (
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
      )}

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
              <Text style={styles.incomeLabel}>
                {t("mobile.financeActual")}
              </Text>
              <Text style={styles.amount} numberOfLines={2}>
                {receivedAmounts}
              </Text>
              <Text style={styles.helper}>
                {t("mobile.financeActualDescription")}
              </Text>
            </InfoCard>

            <View style={styles.secondaryMetrics}>
              <InfoCard style={styles.secondaryMetric}>
                <Text style={styles.incomeLabel}>
                  {t("mobile.financeExpected")}
                </Text>
                <Text style={styles.secondaryAmount} numberOfLines={2}>
                  {expectedAmounts}
                </Text>
                <Text style={styles.helper}>
                  {t("mobile.financeExpectedDescription")}
                </Text>
              </InfoCard>
              <InfoCard style={styles.secondaryMetric}>
                <Text style={styles.incomeLabel}>
                  {t("mobile.financeCompletedAppointments")}
                </Text>
                <Text style={styles.secondaryAmount}>
                  {summary.completedCount}
                </Text>
              </InfoCard>
            </View>

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
              <>
                <IncomeByWeekChart
                  locale={locale}
                  t={t}
                  weeklyIncome={weeklyIncome}
                />
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
              </>
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

function PeriodModeButton({
  label,
  onPress,
  selected,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.periodModeButton,
        selected && styles.periodModeButtonSelected,
      ]}
    >
      <Text
        style={[
          styles.periodModeLabel,
          selected && styles.periodModeLabelSelected,
        ]}
      >
        {label}
      </Text>
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

function IncomeByWeekChart({
  locale,
  t,
  weeklyIncome,
}: {
  readonly locale: SupportedLocale;
  readonly t: (key: MessageKey) => string;
  readonly weeklyIncome: readonly WeeklyIncome[];
}) {
  const currencies = [
    ...new Set(
      weeklyIncome.flatMap((week) =>
        Object.entries(week.amounts)
          .filter(([, amount]) => amount > 0)
          .map(([currency]) => currency),
      ),
    ),
  ].sort();
  if (currencies.length === 0) {
    return (
      <InfoCard>
        <Text style={styles.sectionTitle}>
          {t("mobile.financeWeeklyIncome")}
        </Text>
        <Text style={styles.helper}>{t("mobile.financeNoReceivedIncome")}</Text>
      </InfoCard>
    );
  }

  return (
    <InfoCard style={styles.chartCard}>
      <Text style={styles.sectionTitle}>{t("mobile.financeWeeklyIncome")}</Text>
      {currencies.map((currency) => {
        const maximum = Math.max(
          ...weeklyIncome.map((week) => week.amounts[currency] ?? 0),
          1,
        );
        return (
          <View key={currency} style={styles.currencyChart}>
            <Text style={styles.chartCurrency}>{currency}</Text>
            <View style={styles.chartRows}>
              {weeklyIncome.map((week) => {
                const value = week.amounts[currency] ?? 0;
                const width: `${number}%` =
                  value === 0 ? "0%" : `${(value / maximum) * 100}%`;
                return (
                  <View
                    accessibilityLabel={`${week.label}: ${formatCurrency(value, locale, currency)}`}
                    accessibilityRole="text"
                    key={week.label}
                    style={styles.chartRow}
                  >
                    <View style={styles.chartRowHeading}>
                      <Text style={styles.chartWeek}>{week.label}</Text>
                      <Text style={styles.chartValue}>
                        {value > 0
                          ? formatCurrency(value, locale, currency)
                          : "—"}
                      </Text>
                    </View>
                    <View style={styles.chartBarTrack}>
                      <View style={[styles.chartBar, { width }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </InfoCard>
  );
}

type WeeklyIncome = {
  readonly amounts: Readonly<Record<string, number>>;
  readonly label: string;
};

function summarizeWeeklyIncome(
  appointments: readonly {
    readonly currency: string;
    readonly paid_amount: number | string;
    readonly starts_at: string;
    readonly status: string;
  }[],
  fromDate: string,
  toDate: string,
  locale: SupportedLocale,
  timezone: string,
): WeeklyIncome[] {
  const first = new Date(`${fromDate}T12:00:00.000Z`);
  const last = new Date(`${toDate}T12:00:00.000Z`);
  const dayCount =
    Math.floor((last.getTime() - first.getTime()) / 86_400_000) + 1;
  const weekCount = Math.ceil(dayCount / 7);
  const buckets = Array.from({ length: weekCount }, (_, index) => ({
    amounts: {} as Record<string, number>,
    label: `${dateLabel(addCalendarDays(fromDate, index * 7), locale)}–${dateLabel(addCalendarDays(fromDate, Math.min(dayCount - 1, index * 7 + 6)), locale)}`,
  }));

  for (const appointment of appointments) {
    if (appointment.status !== "completed") continue;
    const localDate = formatDateInTimeZone(
      new Date(appointment.starts_at),
      timezone,
    );
    if (localDate < fromDate || localDate > toDate) continue;
    const day = Math.floor(
      (new Date(`${localDate}T12:00:00.000Z`).getTime() - first.getTime()) /
        86_400_000,
    );
    const weekIndex = Math.floor(day / 7);
    const currency = appointment.currency.trim().toUpperCase();
    const amount = Number(appointment.paid_amount);
    if (!currency || !Number.isFinite(amount)) continue;
    buckets[weekIndex].amounts[currency] =
      (buckets[weekIndex].amounts[currency] ?? 0) + amount;
  }

  return buckets;
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

function monthBoundary(month: string, end: boolean): string {
  const range = getCalendarDateRange(month, "month");
  return end ? range.toDate : range.fromDate;
}

function dateLabel(date: string, locale: SupportedLocale): string {
  return formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
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
  sectionTitle: { ...typography.section, color: colors.primaryText },
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
  periodMode: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  periodModeButton: {
    alignItems: "center",
    borderRadius: radii.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
  },
  periodModeButtonSelected: { backgroundColor: colors.surface },
  periodModeLabel: { ...typography.caption, color: colors.secondaryText },
  periodModeLabelSelected: { color: colors.accent, fontWeight: "700" },
  rangeFields: { gap: spacing.control },
  receivedSummary: { gap: 2 },
  pressed: { opacity: 0.75 },
  retryButton: { alignSelf: "flex-start", marginLeft: -10, marginTop: 4 },
  secondaryAmount: {
    ...typography.metric,
    color: colors.primaryText,
    marginTop: 4,
  },
  secondaryMetric: { flex: 1, minWidth: 0, padding: 12 },
  secondaryMetrics: {
    flexDirection: "row",
    gap: spacing.control,
  },
  state: { alignItems: "center", gap: 8, paddingVertical: 28 },
  summaryCard: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
    gap: 4,
  },
  chartCard: { gap: 16 },
  currencyChart: { gap: 8 },
  chartCurrency: {
    ...typography.label,
    color: colors.secondaryText,
    fontWeight: "700",
  },
  chartRows: { gap: 12 },
  chartRow: { gap: 4 },
  chartRowHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartValue: {
    ...typography.caption,
    color: colors.secondaryText,
  },
  chartBarTrack: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    height: 10,
    overflow: "hidden",
  },
  chartBar: {
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    height: "100%",
  },
  chartWeek: { ...typography.caption, color: colors.secondaryText },
});
