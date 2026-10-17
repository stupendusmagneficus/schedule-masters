import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { Database } from "@schedule-app/api";
import {
  formatAccessibleDate,
  formatCompactDate,
  formatTime,
  getIntlLocale,
} from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ActionButton } from "../../components/ActionButton";
import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "../../components/AppointmentStatusBadge";
import { DashboardPageHeader } from "../../components/DashboardPageHeader";
import { InfoCard } from "../../components/InfoCard";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import type { CustomerProfile } from "../../features/customers/customerDirectory";
import {
  type CustomerSegment,
  getCustomerSegment,
} from "../../features/customers/customerSegments";
import { useCustomerDirectory } from "../../features/customers/useCustomerDirectory";
import { spacing } from "../../theme/spacing";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type CustomersTabProps = DashboardTabProps & {
  readonly client: SupabaseClient<Database> | null;
  readonly onCreateBooking: (customer: CustomerProfile) => void;
  readonly onSelectAppointment: (appointment: MasterAppointment) => void;
  readonly workspace: Workspace;
  readonly visible: boolean;
};

const segmentOrder: readonly CustomerSegment[] = [
  "new",
  "returning",
  "long_absent",
];

export function CustomersTab({
  client,
  locale,
  onCreateBooking,
  onSelectAppointment,
  t,
  workspace,
  visible,
}: CustomersTabProps) {
  const [search, setSearch] = useState("");
  const [activeSegment, setActiveSegment] = useState<CustomerSegment | "all">(
    "all",
  );
  const directory = useCustomerDirectory({
    client,
    search,
    workspaceId: workspace.id,
  });
  const segments = useMemo(
    () =>
      directory.customers.map((customer) => ({
        customer,
        segment: getCustomerSegment(
          customer.completed_visits,
          customer.last_completed_visit_at,
        ),
      })),
    [directory.customers],
  );
  const intlLocale = getIntlLocale(locale);
  const normalizedSearch = search.trim().toLocaleLowerCase(intlLocale);
  const visibleCustomers = segments.filter(({ customer, segment }) => {
    const matchesSegment = activeSegment === "all" || segment === activeSegment;
    const matchesSearch =
      !normalizedSearch ||
      [customer.name, customer.email, customer.phone]
        .filter((value): value is string => Boolean(value))
        .some((value) =>
          value.toLocaleLowerCase(intlLocale).includes(normalizedSearch),
        );
    return matchesSegment && matchesSearch;
  });
  const selected = directory.selectedCustomer;

  if (selected) {
    return (
      <View style={[styles.content, !visible && styles.hidden]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t("common.back")}: ${t("mobile.customers")}`}
          onPress={() => directory.selectCustomer(null)}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            color={colors.primaryText}
            name="chevron-left"
            size={24}
          />
          <Text style={styles.backText}>{t("mobile.customers")}</Text>
        </Pressable>
        <View style={styles.customerHeading}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{t("mobile.customers")}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {selected.name}
            </Text>
            <Text style={styles.helper}>
              {t("mobile.customerVisitCount")}: {selected.completed_visits}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => onCreateBooking(selected)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {t("mobile.customerBooking")}
          </Text>
        </Pressable>
        <InfoCard>
          <Text style={styles.sectionTitle}>{t("mobile.customerContact")}</Text>
          {selected.phone ? (
            <Text style={styles.body}>{selected.phone}</Text>
          ) : null}
          {selected.email ? (
            <Text style={styles.body}>{selected.email}</Text>
          ) : null}
          {!selected.phone && !selected.email ? (
            <Text style={styles.helper}>—</Text>
          ) : null}
          {selected.notes ? (
            <View style={styles.note}>
              <Text style={styles.label}>{t("mobile.customerNote")}</Text>
              <Text style={styles.body}>{selected.notes}</Text>
            </View>
          ) : null}
        </InfoCard>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("mobile.customerHistory")}</Text>
          {directory.isHistoryLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : null}
        </View>
        {directory.historyError ? (
          <ErrorState
            message={t("mobile.customerLoadFailed")}
            onRetry={() => void directory.reloadHistory()}
            retryLabel={t("mobile.customerRetry")}
          />
        ) : null}
        {!directory.isHistoryLoading &&
        !directory.historyError &&
        directory.history.length === 0 ? (
          <InfoCard>
            <Text style={styles.helper}>
              {t("mobile.customerHistoryEmpty")}
            </Text>
          </InfoCard>
        ) : null}
        {directory.history.map((visit) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${formatAccessibleDate(new Date(visit.starts_at), locale, workspace.timezone)} ${visit.service_name}`}
            key={visit.id}
            onPress={() => onSelectAppointment(visit)}
          >
            <InfoCard style={styles.visitCard}>
              <View style={styles.visitHeading}>
                <Text style={styles.visitDate}>
                  {formatCompactDate(new Date(visit.starts_at), locale, {
                    timeZone: workspace.timezone,
                  })}
                  {" · "}
                  {formatTime(new Date(visit.starts_at), locale, {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: workspace.timezone,
                  })}
                </Text>
                <AppointmentStatusBadge
                  label={getAppointmentStatusLabel(visit.status, t)}
                  status={visit.status}
                />
              </View>
              <Text style={styles.body}>{visit.service_name}</Text>
              <Text style={styles.helper}>
                {formatCurrency(visit.price_amount, visit.currency, locale)}
              </Text>
            </InfoCard>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.content, !visible && styles.hidden]}>
      <DashboardPageHeader title={t("mobile.customers")} />
      <TextInput
        accessibilityLabel={t("mobile.customerSearch")}
        onChangeText={setSearch}
        placeholder={t("mobile.customerSearch")}
        placeholderTextColor={colors.secondaryText}
        returnKeyType="search"
        style={styles.search}
        value={search}
      />
      <View accessibilityRole="tablist" style={styles.segmentList}>
        <SegmentButton
          active={activeSegment === "all"}
          label={t("mobile.customers")}
          onPress={() => setActiveSegment("all")}
        />
        {segmentOrder.map((segment) => (
          <SegmentButton
            active={activeSegment === segment}
            key={segment}
            label={t(segmentLabel(segment))}
            onPress={() => setActiveSegment(segment)}
          />
        ))}
      </View>
      {activeSegment !== "all" ? (
        <Text style={styles.helper}>
          {t(
            activeSegment === "new"
              ? "mobile.customerNewRule"
              : activeSegment === "returning"
                ? "mobile.customerReturningRule"
                : "mobile.customerLongAbsentRule",
          )}
        </Text>
      ) : null}
      {directory.isLoading ? (
        <View accessibilityLiveRegion="polite" style={styles.state}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.helper}>{t("common.loading")}</Text>
        </View>
      ) : null}
      {directory.error ? (
        <ErrorState
          message={t("mobile.customerLoadFailed")}
          onRetry={() => void directory.reload()}
          retryLabel={t("mobile.customerRetry")}
        />
      ) : null}
      {!directory.isLoading &&
      !directory.error &&
      visibleCustomers.length === 0 ? (
        <InfoCard>
          <Text style={styles.helper}>
            {directory.customers.length === 0 && !search.trim()
              ? t("mobile.customerEmpty")
              : t("mobile.customerSearchEmpty")}
          </Text>
        </InfoCard>
      ) : null}
      {visibleCustomers.map(({ customer, segment }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={customer.name}
          key={customer.id}
          onPress={() => directory.selectCustomer(customer)}
        >
          <InfoCard style={styles.customerRow}>
            <View style={styles.customerCopy}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text numberOfLines={1} style={styles.helper}>
                {customer.phone || customer.email || "—"}
              </Text>
            </View>
            <Text style={styles.segmentLabel}>{t(segmentLabel(segment))}</Text>
          </InfoCard>
        </Pressable>
      ))}
    </View>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segment, active && styles.activeSegment]}
    >
      <Text style={[styles.segmentText, active && styles.activeSegmentText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ErrorState({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <InfoCard style={styles.errorState}>
      <Text accessibilityRole="alert" style={styles.error}>
        {message}
      </Text>
      <ActionButton
        label={retryLabel}
        onPress={onRetry}
        size="compact"
        style={styles.retryButton}
        variant="quiet"
      />
    </InfoCard>
  );
}

function segmentLabel(segment: CustomerSegment) {
  if (segment === "new") return "mobile.customerNew" as const;
  if (segment === "returning") return "mobile.customerReturning" as const;
  return "mobile.customerLongAbsent" as const;
}

function formatCurrency(
  amount: number,
  currency: string,
  locale: DashboardTabProps["locale"],
) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

const styles = StyleSheet.create({
  activeSegment: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  activeSegmentText: { color: colors.accent },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  backText: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
  },
  body: { ...typography.body, color: colors.primaryText },
  content: { gap: spacing.section },
  customerHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.control,
  },
  customerCopy: { flex: 1, gap: 3, minWidth: 0 },
  customerName: { ...typography.label, color: colors.primaryText },
  customerRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  error: { ...typography.body, color: colors.danger, marginBottom: 8 },
  eyebrow: {
    color: colors.accent,
    marginBottom: 4,
    textTransform: "uppercase",
    ...typography.eyebrow,
  },
  helper: { ...typography.body, color: colors.secondaryText },
  header: { flex: 1, gap: 2, minWidth: 0 },
  hidden: { display: "none" },
  label: { ...typography.label, color: colors.secondaryText, marginBottom: 4 },
  note: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    textAlignVertical: "center",
  },
  primaryButtonText: {
    ...typography.label,
    color: colors.actionText,
    fontWeight: "700",
  },
  errorState: { alignItems: "flex-start", gap: 4 },
  retryButton: { alignSelf: "flex-start", marginLeft: -10 },
  search: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.primaryText,
    minHeight: 48,
    paddingHorizontal: 16,
    textAlignVertical: "center",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: { ...typography.section, color: colors.primaryText },
  segment: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  segmentLabel: {
    ...typography.caption,
    color: colors.secondaryText,
    flexShrink: 0,
  },
  segmentList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segmentText: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "600",
  },
  state: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
  },
  title: { ...typography.heading, color: colors.primaryText },
  visitCard: { gap: 8 },
  visitDate: { ...typography.label, color: colors.primaryText, flexShrink: 1 },
  visitHeading: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
});
