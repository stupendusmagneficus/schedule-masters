import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  listMasterCustomers,
  type ManualBookingCustomer,
} from "../features/appointments/manualBooking";
import {
  createMasterWaitingListCustomer,
  type MasterWaitingListEntry,
  removeAllMasterWaitingListEntries,
  saveMasterWaitingListEntry,
  setMasterWaitingListEntryStatus,
  type WaitingListDraft,
} from "../features/waitingList/waitingList";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service } from "../types";
import { DateTimePickerField } from "./DateTimePickerField";
import { FullscreenModal } from "./FullscreenModal";
import { InfoCard } from "./InfoCard";

type WaitingListModalProps = {
  readonly client: SupabaseClient<Database>;
  readonly defaultDate: string;
  readonly entries: readonly MasterWaitingListEntry[];
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onReload: () => void;
  readonly onSaved: () => Promise<void>;
  readonly services: readonly Service[];
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
  readonly workspaceId: string;
};

export function WaitingListModal({
  client,
  defaultDate,
  entries,
  error,
  isLoading,
  locale,
  onClose,
  onReload,
  onSaved,
  services,
  t,
  visible,
  workspaceId,
}: WaitingListModalProps) {
  const [editing, setEditing] = useState<MasterWaitingListEntry | null>(null);
  const [formMode, setFormMode] = useState<"existing" | "new" | "edit" | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false);
  const [actionError, setActionError] = useState<"save" | "duplicate" | null>(
    null,
  );
  const [isLoadingCustomers, setLoadingCustomers] = useState(false);
  const [customers, setCustomers] = useState<ManualBookingCustomer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [draft, setDraft] = useState<WaitingListDraft>(() =>
    emptyDraft(services, defaultDate),
  );

  useEffect(() => {
    if (!visible) return;
    let active = true;
    const timer = setTimeout(
      () => {
        setLoadingCustomers(true);
        void listMasterCustomers(client, workspaceId, customerSearch)
          .then((nextCustomers) => {
            if (active) setCustomers(nextCustomers);
          })
          .catch(() => {
            if (active) setCustomers([]);
          })
          .finally(() => {
            if (active) setLoadingCustomers(false);
          });
      },
      customerSearch.trim() ? 250 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [client, customerSearch, visible, workspaceId]);

  const matchingCustomers = useMemo(() => {
    const query = customerSearch.trim().toLocaleLowerCase(locale);
    return customers
      .filter(
        (customer) =>
          !query ||
          `${customer.name} ${customer.email} ${customer.phone}`
            .toLocaleLowerCase(locale)
            .includes(query),
      )
      .slice(0, 6);
  }, [customerSearch, customers, locale]);

  function startNew(mode: "existing" | "new") {
    setEditing(null);
    setFormMode(mode);
    setDraft(emptyDraft(services, defaultDate));
    setCustomerSearch("");
    setActionError(null);
  }

  function startEdit(entry: MasterWaitingListEntry) {
    setEditing(entry);
    setFormMode("edit");
    setDraft({
      customerEmail: entry.customer_email ?? "",
      customerId: entry.customer_id,
      customerName: entry.customer_name,
      customerPhone: entry.customer_phone ?? "",
      desiredDate: entry.desired_date,
      desiredTimeFrom: entry.desired_time_from ?? "",
      desiredTimeTo: entry.desired_time_to ?? "",
      note: entry.note ?? "",
      serviceId: entry.service_id,
    });
    setCustomerSearch(entry.customer_name);
    setActionError(null);
  }

  async function save() {
    if (
      !draft.customerName.trim() ||
      !draft.desiredDate ||
      !draft.serviceId ||
      (formMode === "existing" && !draft.customerId) ||
      ((formMode === "new" || !draft.customerId) &&
        !draft.customerEmail?.trim() &&
        !draft.customerPhone?.trim())
    ) {
      setActionError("save");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      if (formMode === "new" && !editing) {
        await createMasterWaitingListCustomer(client, workspaceId, draft);
      } else {
        await saveMasterWaitingListEntry(
          client,
          workspaceId,
          draft,
          editing?.id,
        );
      }
      setFormMode(null);
      setEditing(null);
      await onSaved();
    } catch (error) {
      setActionError(
        error instanceof Error &&
          error.message.includes("Customer contact already exists")
          ? "duplicate"
          : "save",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: MasterWaitingListEntry) {
    setSaving(true);
    setActionError(null);
    try {
      await setMasterWaitingListEntryStatus(
        client,
        workspaceId,
        entry.id,
        "removed",
      );
      await onSaved();
    } catch {
      setActionError("save");
    } finally {
      setSaving(false);
    }
  }

  async function removeAll() {
    setSaving(true);
    setActionError(null);
    try {
      await removeAllMasterWaitingListEntries(client, workspaceId);
      setConfirmRemoveAll(false);
      await onSaved();
    } catch {
      setActionError("save");
    } finally {
      setSaving(false);
    }
  }

  function close() {
    if (saving) return;
    setFormMode(null);
    setEditing(null);
    setActionError(null);
    setConfirmRemoveAll(false);
    onClose();
  }

  return (
    <FullscreenModal
      closeDisabled={saving}
      closeLabel={t("common.close")}
      onClose={close}
      title={t("mobile.waitingList")}
      visible={visible}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {formMode ? (
          <InfoCard>
            <Text style={styles.sectionTitle}>
              {formMode === "edit"
                ? t("mobile.waitingListEdit")
                : formMode === "existing"
                  ? t("mobile.waitingListAddExisting")
                  : t("mobile.waitingListAddNew")}
            </Text>
            {formMode === "new" ||
            (formMode === "edit" && !draft.customerId) ? (
              <>
                <Text style={styles.label}>
                  {t("mobile.waitingListCustomerName")}
                </Text>
                <TextInput
                  accessibilityLabel={t("mobile.waitingListCustomerName")}
                  onChangeText={(customerName) =>
                    setDraft((current) => ({ ...current, customerName }))
                  }
                  style={styles.input}
                  value={draft.customerName}
                />
                <Text style={styles.secondary}>
                  {t("mobile.waitingListContactRequired")}
                </Text>
                <Text style={styles.label}>{t("mobile.waitingListEmail")}</Text>
                <TextInput
                  accessibilityLabel={t("mobile.waitingListEmail")}
                  keyboardType="email-address"
                  onChangeText={(customerEmail) =>
                    setDraft((current) => ({ ...current, customerEmail }))
                  }
                  style={styles.input}
                  value={draft.customerEmail}
                />
                <Text style={styles.label}>{t("mobile.waitingListPhone")}</Text>
                <TextInput
                  accessibilityLabel={t("mobile.waitingListPhone")}
                  keyboardType="phone-pad"
                  onChangeText={(customerPhone) =>
                    setDraft((current) => ({ ...current, customerPhone }))
                  }
                  style={styles.input}
                  value={draft.customerPhone}
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>
                  {t("mobile.waitingListCustomer")}
                </Text>
                <TextInput
                  accessibilityLabel={t("mobile.waitingListCustomer")}
                  onChangeText={(value) => {
                    setCustomerSearch(value);
                    setDraft((current) => ({
                      ...current,
                      customerId: null,
                      customerName: value,
                      customerEmail: "",
                      customerPhone: "",
                    }));
                  }}
                  placeholder={t("mobile.customerSearch")}
                  placeholderTextColor={colors.secondaryText}
                  style={styles.input}
                  value={customerSearch}
                />
                {matchingCustomers.map((customer) => (
                  <Pressable
                    accessibilityRole="button"
                    key={customer.id}
                    onPress={() => {
                      setCustomerSearch(customer.name);
                      setDraft((current) => ({
                        ...current,
                        customerId: customer.id,
                        customerName: customer.name,
                        customerEmail: customer.email,
                        customerPhone: customer.phone,
                      }));
                    }}
                    style={styles.customerOption}
                  >
                    <Text style={styles.body}>{customer.name}</Text>
                    <Text style={styles.secondary}>
                      {customer.email || customer.phone || "—"}
                    </Text>
                  </Pressable>
                ))}
                {isLoadingCustomers ? (
                  <ActivityIndicator color={colors.accent} />
                ) : null}
                {draft.customerId ? (
                  <Text style={styles.selectedCustomer}>
                    {t("mobile.waitingListSelectedCustomer").replace(
                      "{name}",
                      draft.customerName,
                    )}
                  </Text>
                ) : null}
              </>
            )}
            <Text style={styles.label}>{t("mobile.waitingListService")}</Text>
            <View style={styles.serviceList}>
              {services.map((service) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: draft.serviceId === service.id,
                  }}
                  key={service.id}
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      serviceId: service.id,
                    }))
                  }
                  style={[
                    styles.chip,
                    draft.serviceId === service.id && styles.selectedChip,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draft.serviceId === service.id && styles.selectedChipText,
                    ]}
                  >
                    {service.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <DateTimePickerField
              label={t("mobile.waitingListDate")}
              locale={locale}
              mode="date"
              onChange={(desiredDate) =>
                setDraft((current) => ({ ...current, desiredDate }))
              }
              placeholder=""
              t={t}
              value={draft.desiredDate}
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <DateTimePickerField
                  label={t("mobile.waitingListFrom")}
                  locale={locale}
                  mode="time"
                  onChange={(desiredTimeFrom) =>
                    setDraft((current) => ({ ...current, desiredTimeFrom }))
                  }
                  placeholder=""
                  t={t}
                  value={draft.desiredTimeFrom ?? ""}
                />
              </View>
              <View style={styles.half}>
                <DateTimePickerField
                  label={t("mobile.waitingListTo")}
                  locale={locale}
                  mode="time"
                  onChange={(desiredTimeTo) =>
                    setDraft((current) => ({ ...current, desiredTimeTo }))
                  }
                  placeholder=""
                  t={t}
                  value={draft.desiredTimeTo ?? ""}
                />
              </View>
            </View>
            <Text style={styles.label}>{t("mobile.waitingListNote")}</Text>
            <TextInput
              accessibilityLabel={t("mobile.waitingListNote")}
              multiline
              onChangeText={(note) =>
                setDraft((current) => ({ ...current, note }))
              }
              style={[styles.input, styles.note]}
              value={draft.note}
            />
            {actionError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {t(
                  actionError === "duplicate"
                    ? "mobile.waitingListDuplicateCustomer"
                    : "mobile.waitingListSaveFailed",
                )}
              </Text>
            ) : null}
            {actionError === "duplicate" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setFormMode("existing");
                  setEditing(null);
                  setCustomerSearch(
                    draft.customerEmail ||
                      draft.customerPhone ||
                      draft.customerName,
                  );
                  setDraft((current) => ({ ...current, customerId: null }));
                  setActionError(null);
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {t("mobile.waitingListAddExisting")}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={
                saving || !draft.customerName.trim() || !draft.serviceId
              }
              onPress={() => void save()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>
                {saving ? t("common.loading") : t("common.save")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setFormMode(null);
                setEditing(null);
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {t("common.cancel")}
              </Text>
            </Pressable>
          </InfoCard>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => startNew("existing")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>
                {t("mobile.waitingListAddExisting")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => startNew("new")}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {t("mobile.waitingListAddNew")}
              </Text>
            </Pressable>
            {entries.some((entry) => entry.status === "active") ? (
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => {
                  setConfirmRemoveAll(true);
                  setActionError(null);
                }}
                style={styles.removeAllButton}
              >
                <Text style={styles.removeAllText}>
                  {t("mobile.waitingListRemoveAll")}
                </Text>
              </Pressable>
            ) : null}
            {confirmRemoveAll ? (
              <InfoCard>
                <Text style={styles.body}>
                  {t("mobile.waitingListRemoveAllPrompt").replace(
                    "{count}",
                    String(
                      entries.filter((entry) => entry.status === "active")
                        .length,
                    ),
                  )}
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    onPress={() => setConfirmRemoveAll(false)}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {t("common.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    onPress={() => void removeAll()}
                    style={styles.removeAllButton}
                  >
                    <Text style={styles.removeAllText}>
                      {saving
                        ? t("common.loading")
                        : t("mobile.waitingListRemoveAllConfirm")}
                    </Text>
                  </Pressable>
                </View>
              </InfoCard>
            ) : null}
            {actionError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {t(
                  actionError === "duplicate"
                    ? "mobile.waitingListDuplicateCustomer"
                    : "mobile.waitingListSaveFailed",
                )}
              </Text>
            ) : null}
            {isLoading && entries.length === 0 ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.secondary}>{t("common.loading")}</Text>
              </View>
            ) : error ? (
              <Pressable
                accessibilityRole="button"
                onPress={onReload}
                style={styles.empty}
              >
                <Text style={styles.error}>
                  {t("mobile.waitingListLoadFailed")}
                </Text>
                <Text style={styles.secondary}>{t("common.retry")}</Text>
              </Pressable>
            ) : entries.length === 0 ? (
              <InfoCard>
                <Text style={styles.body}>{t("mobile.waitingListEmpty")}</Text>
              </InfoCard>
            ) : (
              entries.map((entry) => (
                <InfoCard key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={styles.entryCopy}>
                      <Text style={styles.body}>{entry.customer_name}</Text>
                      <Text style={styles.secondary}>
                        {entry.service_name} ·{" "}
                        {formatDate(
                          new Date(`${entry.desired_date}T12:00:00`),
                          locale,
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                        {entry.desired_time_from
                          ? ` · ${entry.desired_time_from.slice(0, 5)}${entry.desired_time_to ? `–${entry.desired_time_to.slice(0, 5)}` : ""}`
                          : ""}
                      </Text>
                    </View>
                    <Text
                      style={
                        entry.status === "active"
                          ? styles.activeStatus
                          : styles.secondary
                      }
                    >
                      {t(
                        `mobile.waitingListStatus${entry.status === "active" ? "Active" : entry.status === "booked" ? "Booked" : "Removed"}` as MessageKey,
                      )}
                    </Text>
                  </View>
                  {entry.customer_phone || entry.customer_email ? (
                    <Text selectable style={styles.secondary}>
                      {[entry.customer_phone, entry.customer_email]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  ) : null}
                  {entry.note ? (
                    <Text style={styles.secondary}>{entry.note}</Text>
                  ) : null}
                  {entry.status === "active" ? (
                    <View style={styles.actions}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => startEdit(entry)}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryButtonText}>
                          {t("common.edit")}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={saving}
                        onPress={() => void remove(entry)}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryButtonText}>
                          {t("common.delete")}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </InfoCard>
              ))
            )}
          </>
        )}
      </ScrollView>
    </FullscreenModal>
  );
}

function emptyDraft(
  services: readonly Service[],
  defaultDate: string,
): WaitingListDraft {
  const desiredDate = defaultDate;
  return { customerName: "", desiredDate, serviceId: services[0]?.id ?? "" };
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 40 },
  sectionTitle: {
    ...typography.section,
    color: colors.primaryText,
    marginBottom: 12,
  },
  label: {
    ...typography.label,
    color: colors.primaryText,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.primaryText,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  note: { minHeight: 84, paddingVertical: 10, textAlignVertical: "top" },
  body: { ...typography.body, color: colors.primaryText, fontWeight: "600" },
  secondary: { ...typography.caption, color: colors.secondaryText },
  error: { ...typography.label, color: colors.danger },
  customerOption: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
    padding: 10,
  },
  serviceList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedChip: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: { ...typography.caption, color: colors.primaryText },
  selectedChipText: { color: colors.accent, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primaryText,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  removeAllButton: {
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  removeAllText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "700",
  },
  selectedCustomer: {
    ...typography.caption,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.surface,
    color: colors.accent,
    padding: 10,
  },
  primaryText: { ...typography.label, color: colors.surface },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "600",
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  entryCard: { gap: 8, padding: 12 },
  entryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  entryCopy: { flex: 1, gap: 2 },
  activeStatus: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  loading: { alignItems: "center", flexDirection: "row", gap: 10, padding: 16 },
  empty: { gap: 6, padding: 16 },
});
