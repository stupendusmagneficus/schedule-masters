import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { Database } from "@schedule-app/api";
import {
  formatAccessibleDate,
  formatCompactDate,
  formatTime,
  getIntlLocale,
} from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { buildCustomerPhoneUrl } from "../../features/customers/customerContact";
import type { CustomerProfile } from "../../features/customers/customerDirectory";
import { anonymizeCustomer } from "../../features/customers/customerDirectory";
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
  const directory = useCustomerDirectory({
    client,
    search,
    workspaceId: workspace.id,
  });
  const selected = directory.selectedCustomer;
  const customerSmsUrl = selected?.phone
    ? buildCustomerPhoneUrl(selected.phone, "sms")
    : null;
  const customerCallUrl = selected?.phone
    ? buildCustomerPhoneUrl(selected.phone, "call")
    : null;
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeletingCustomer, setDeletingCustomer] = useState(false);
  const [deleteCustomerError, setDeleteCustomerError] = useState(false);

  async function deleteSelectedCustomer() {
    if (!client || !selected) return;
    setDeletingCustomer(true);
    setDeleteCustomerError(false);
    try {
      await anonymizeCustomer(client, workspace.id, selected.id);
      setShowDeleteConfirmation(false);
      directory.selectCustomer(null);
      await directory.reload();
    } catch {
      setDeleteCustomerError(true);
    } finally {
      setDeletingCustomer(false);
    }
  }

  if (selected) {
    return (
      <View style={[styles.content, !visible && styles.hidden]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t("common.back")}: ${t("mobile.customers")}`}
          onPress={() => {
            setShowDeleteConfirmation(false);
            setDeleteCustomerError(false);
            directory.selectCustomer(null);
          }}
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
          {selected.phone ? (
            <View style={styles.contactActions}>
              {customerCallUrl ? (
                <Pressable
                  accessibilityLabel={t("mobile.customerCall")}
                  accessibilityRole="button"
                  onPress={() =>
                    void Linking.openURL(customerCallUrl).catch(() =>
                      Alert.alert(t("mobile.customerContactActionFailed")),
                    )
                  }
                  style={styles.contactAction}
                >
                  <MaterialCommunityIcons
                    color={colors.accent}
                    name="phone-outline"
                    size={22}
                  />
                </Pressable>
              ) : null}
              {customerSmsUrl ? (
                <Pressable
                  accessibilityLabel={t("mobile.customerSms")}
                  accessibilityRole="button"
                  onPress={() =>
                    void Linking.openURL(customerSmsUrl).catch(() =>
                      Alert.alert(t("mobile.customerContactActionFailed")),
                    )
                  }
                  style={styles.contactAction}
                >
                  <MaterialCommunityIcons
                    color={colors.accent}
                    name="message-text-outline"
                    size={22}
                  />
                </Pressable>
              ) : null}
            </View>
          ) : null}
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
            <Text numberOfLines={1} style={styles.body}>
              {selected.email}
            </Text>
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
        {showDeleteConfirmation ? (
          <InfoCard style={styles.deleteConfirmation}>
            <Text style={styles.body}>{t("mobile.customerDeleteConfirm")}</Text>
            {deleteCustomerError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {t("mobile.customerDeleteFailed")}
              </Text>
            ) : null}
            <View style={styles.deleteActions}>
              <ActionButton
                disabled={isDeletingCustomer}
                label={t("mobile.customerDeleteCancel")}
                onPress={() => setShowDeleteConfirmation(false)}
                size="compact"
                variant="quiet"
              />
              <ActionButton
                label={t("mobile.customerDeleteConfirmAction")}
                loading={isDeletingCustomer}
                loadingLabel={t("mobile.customerDeleteSaving")}
                onPress={() => void deleteSelectedCustomer()}
                size="compact"
                variant="destructiveConfirm"
              />
            </View>
          </InfoCard>
        ) : (
          <ActionButton
            label={t("mobile.customerDelete")}
            onPress={() => setShowDeleteConfirmation(true)}
            size="compact"
            style={styles.deleteCustomerButton}
            variant="destructive"
          />
        )}
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
      directory.customers.length === 0 ? (
        <InfoCard>
          <Text style={styles.helper}>
            {directory.customers.length === 0 && !search.trim()
              ? t("mobile.customerEmpty")
              : t("mobile.customerSearchEmpty")}
          </Text>
        </InfoCard>
      ) : null}
      {directory.customers.map((customer) => {
        const phoneUrl = customer.phone
          ? buildCustomerPhoneUrl(customer.phone, "call")
          : null;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={customer.name}
            key={customer.id}
            onPress={() => directory.selectCustomer(customer)}
          >
            <InfoCard style={styles.customerRow}>
              <View style={styles.customerCopy}>
                <Text style={styles.customerName}>{customer.name}</Text>
                {customer.phone ? (
                  phoneUrl ? (
                    <Pressable
                      accessibilityHint={customer.phone}
                      accessibilityLabel={`${t("mobile.customerCall")}: ${customer.phone}`}
                      accessibilityRole="link"
                      onPress={(event) => {
                        event.stopPropagation();
                        void Linking.openURL(phoneUrl).catch(() =>
                          Alert.alert(t("mobile.customerContactActionFailed")),
                        );
                      }}
                      style={styles.phoneLink}
                    >
                      <MaterialCommunityIcons
                        color={colors.secondaryText}
                        name="phone-outline"
                        size={16}
                      />
                      <Text numberOfLines={1} style={styles.phoneText}>
                        {customer.phone}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.phoneLink}>
                      <MaterialCommunityIcons
                        color={colors.secondaryText}
                        name="phone-outline"
                        size={16}
                      />
                      <Text numberOfLines={1} style={styles.phoneText}>
                        {customer.phone}
                      </Text>
                    </View>
                  )
                ) : null}
              </View>
              <Pressable
                accessibilityLabel={t("mobile.openCustomerDetails")}
                accessibilityRole="button"
                onPress={(event) => {
                  event.stopPropagation();
                  directory.selectCustomer(customer);
                }}
                style={styles.detailsButton}
              >
                <MaterialCommunityIcons
                  color={colors.secondaryText}
                  name="dots-horizontal"
                  size={24}
                />
              </Pressable>
            </InfoCard>
          </Pressable>
        );
      })}
    </View>
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
  customerCopy: { flex: 1, gap: 0, minWidth: 0 },
  customerName: { ...typography.label, color: colors.primaryText },
  contactActions: { flexDirection: "row", gap: 4 },
  deleteActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.control,
    justifyContent: "flex-end",
  },
  deleteConfirmation: { borderColor: colors.danger, gap: spacing.control },
  deleteCustomerButton: { alignSelf: "flex-start" },
  contactAction: {
    alignItems: "center",
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  customerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    padding: 8,
  },
  detailsButton: {
    alignItems: "center",
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
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
  phoneLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    maxWidth: "100%",
  },
  phoneText: {
    ...typography.body,
    color: colors.secondaryText,
    flexShrink: 1,
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
