import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatTime } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  type AvailableSlot,
  createIdempotencyKey,
  createMasterBooking,
  listMasterAvailableSlots,
  listMasterCustomers,
  type ManualBookingCustomer,
  type ManualBookingDraft,
  type ManualBookingValidationError,
  validateManualBookingDraft,
} from "../features/appointments/manualBooking";
import { colors, radii, shadows } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service, Workspace } from "../types";
import { DateTimePickerField } from "./DateTimePickerField";

type ManualBookingModalProps = {
  readonly client: SupabaseClient<Database>;
  readonly initialDate: string;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onCreated: () => Promise<void>;
  readonly service: Service | null;
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
  readonly workspace: Workspace;
};

export function ManualBookingModal({
  client,
  initialDate,
  locale,
  onClose,
  onCreated,
  service,
  t,
  visible,
  workspace,
}: ManualBookingModalProps) {
  const [draft, setDraft] = useState<ManualBookingDraft>(() =>
    createInitialDraft(service, initialDate),
  );
  const [customers, setCustomers] = useState<ManualBookingCustomer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isExistingCustomer, setExistingCustomer] = useState(true);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingCustomers, setLoadingCustomers] = useState(false);
  const [isLoadingSlots, setLoadingSlots] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] =
    useState<ManualBookingValidationError | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraft(createInitialDraft(service, initialDate));
    setCustomerSearch("");
    setExistingCustomer(true);
    setSlots([]);
    setError(null);
    setValidationError(null);
    setIdempotencyKey(createIdempotencyKey());
  }, [initialDate, service, visible]);

  useEffect(() => {
    if (!visible || !isExistingCustomer) return;
    let active = true;
    setLoadingCustomers(true);
    void listMasterCustomers(client, workspace.id, customerSearch)
      .then((nextCustomers) => {
        if (active) setCustomers(nextCustomers);
      })
      .catch(() => {
        if (active) setError(t("mobile.manualBookingLoadFailed"));
      })
      .finally(() => {
        if (active) setLoadingCustomers(false);
      });
    return () => {
      active = false;
    };
  }, [client, customerSearch, isExistingCustomer, t, visible, workspace.id]);

  useEffect(() => {
    if (!visible || !service || !draft.date) return;
    let active = true;
    setLoadingSlots(true);
    setSlots([]);
    setDraft((current) => ({ ...current, startsAt: "" }));
    void listMasterAvailableSlots(client, workspace.id, service.id, draft.date)
      .then((nextSlots) => {
        if (active) setSlots(nextSlots);
      })
      .catch(() => {
        if (active) setError(t("mobile.manualBookingLoadFailed"));
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [client, draft.date, service, t, visible, workspace.id]);

  function updateDraft(patch: Partial<ManualBookingDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setValidationError(null);
    setError(null);
  }

  function selectCustomer(customer: ManualBookingCustomer) {
    updateDraft({
      customerId: customer.id,
      email: customer.email ?? "",
      name: customer.name,
      phone: customer.phone ?? "",
    });
  }

  async function handleSubmit() {
    const nextValidationError = validateManualBookingDraft(draft);
    setValidationError(nextValidationError);
    if (nextValidationError) return;

    setSaving(true);
    setError(null);
    try {
      await createMasterBooking(client, workspace.id, draft, idempotencyKey);
      await onCreated();
      onClose();
    } catch (nextError) {
      setError(serverErrorMessage(nextError, t));
    } finally {
      setSaving(false);
    }
  }

  const selectedCustomerId = draft.customerId;
  const errorMessage = validationError
    ? validationMessage(validationError, t)
    : error;

  return (
    <Modal
      accessibilityViewIsModal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t("mobile.manualBookingTitle")}</Text>
              <Text style={styles.description}>
                {t("mobile.manualBookingDescription")}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("common.cancel")}
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.segmentedControl}>
              <ModeButton
                active={isExistingCustomer}
                label={t("mobile.manualBookingExistingCustomer")}
                onPress={() => {
                  setExistingCustomer(true);
                  updateDraft({ customerId: null });
                }}
              />
              <ModeButton
                active={!isExistingCustomer}
                label={t("mobile.manualBookingNewCustomer")}
                onPress={() => {
                  setExistingCustomer(false);
                  updateDraft({
                    customerId: null,
                    email: "",
                    name: "",
                    phone: "",
                  });
                }}
              />
            </View>

            {isExistingCustomer ? (
              <View style={styles.customerSection}>
                <Field
                  label={t("mobile.manualBookingSearchCustomer")}
                  onChangeText={setCustomerSearch}
                  placeholder={t("mobile.manualBookingSearchCustomer")}
                  value={customerSearch}
                />
                {isLoadingCustomers ? (
                  <Text style={styles.helper}>{t("common.loading")}</Text>
                ) : customers.length ? (
                  <View style={styles.customerList}>
                    {customers.slice(0, 6).map((customer) => (
                      <Pressable
                        accessibilityRole="button"
                        key={customer.id}
                        onPress={() => selectCustomer(customer)}
                        style={[
                          styles.customerRow,
                          selectedCustomerId === customer.id &&
                            styles.selectedCustomerRow,
                        ]}
                      >
                        <View style={styles.customerCopy}>
                          <Text style={styles.customerName}>
                            {customer.name}
                          </Text>
                          <Text style={styles.helper}>
                            {customer.phone || customer.email || "—"}
                          </Text>
                        </View>
                        {selectedCustomerId === customer.id ? (
                          <Text style={styles.selectedMark}>✓</Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.helper}>
                    {t("mobile.manualBookingNoCustomers")}
                  </Text>
                )}
              </View>
            ) : null}

            <Field
              error={validationError === "name"}
              label={t("mobile.manualBookingCustomerName")}
              onChangeText={(name) => updateDraft({ customerId: null, name })}
              placeholder={t("mobile.manualBookingCustomerName")}
              value={draft.name}
            />
            <Field
              error={validationError === "email"}
              keyboardType="email-address"
              label={t("mobile.manualBookingCustomerEmail")}
              onChangeText={(email) => updateDraft({ email })}
              placeholder={t("mobile.manualBookingCustomerEmail")}
              value={draft.email}
            />
            <Field
              label={t("mobile.manualBookingCustomerPhone")}
              keyboardType="phone-pad"
              onChangeText={(phone) => updateDraft({ phone })}
              placeholder={t("mobile.manualBookingCustomerPhone")}
              value={draft.phone}
            />

            <View style={styles.serviceCard}>
              <Text style={styles.label}>
                {t("mobile.manualBookingService")}
              </Text>
              <Text style={styles.serviceName}>
                {service?.name ?? t("mobile.noServices")}
              </Text>
            </View>

            <DateTimePickerField
              label={t("mobile.manualBookingDate")}
              mode="date"
              onChange={(date) => updateDraft({ date })}
              placeholder={t("mobile.personalBlockDatePlaceholder")}
              value={draft.date}
            />

            <View style={styles.field}>
              <Text style={styles.label}>{t("mobile.manualBookingTime")}</Text>
              {isLoadingSlots ? (
                <Text style={styles.helper}>{t("common.loading")}</Text>
              ) : slots.length ? (
                <View style={styles.slots}>
                  {slots.map((slot) => {
                    const isSelected = draft.startsAt === slot.starts_at;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={slot.starts_at}
                        onPress={() =>
                          updateDraft({ startsAt: slot.starts_at })
                        }
                        style={[styles.slot, isSelected && styles.selectedSlot]}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            isSelected && styles.selectedSlotText,
                          ]}
                        >
                          {formatTime(new Date(slot.starts_at), locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: workspace.timezone,
                          })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.helper}>
                  {t("mobile.manualBookingNoSlots")}
                </Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={styles.rowField}>
                <Field
                  error={validationError === "duration"}
                  keyboardType="number-pad"
                  label={t("mobile.manualBookingDuration")}
                  onChangeText={(durationMinutes) =>
                    updateDraft({ durationMinutes })
                  }
                  placeholder="90"
                  value={draft.durationMinutes}
                />
              </View>
              <View style={styles.rowField}>
                <Field
                  error={validationError === "price"}
                  keyboardType="decimal-pad"
                  label={t("mobile.manualBookingPrice")}
                  onChangeText={(priceAmount) => updateDraft({ priceAmount })}
                  placeholder="700"
                  value={draft.priceAmount}
                />
              </View>
            </View>

            <Field
              label={t("mobile.manualBookingNote")}
              multiline
              onChangeText={(masterNote) => updateDraft({ masterNote })}
              placeholder={t("mobile.manualBookingNotePlaceholder")}
              value={draft.masterNote}
            />

            {errorMessage ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {errorMessage}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={onClose}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving || !service}
                onPress={() => void handleSubmit()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  (isSaving || !service) && styles.disabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {isSaving
                    ? t("common.loading")
                    : t("mobile.manualBookingCreate")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  error = false,
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  readonly error?: boolean;
  readonly keyboardType?:
    | "decimal-pad"
    | "email-address"
    | "number-pad"
    | "phone-pad";
  readonly label: string;
  readonly multiline?: boolean;
  readonly onChangeText: (value: string) => void;
  readonly placeholder: string;
  readonly value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        style={[
          styles.input,
          error && styles.inputError,
          multiline && styles.multilineInput,
        ]}
        value={value}
      />
    </View>
  );
}

function ModeButton({
  active,
  label,
  onPress,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.modeButton, active && styles.activeModeButton]}
    >
      <Text
        style={[styles.modeButtonText, active && styles.activeModeButtonText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createInitialDraft(
  service: Service | null,
  date: string,
): ManualBookingDraft {
  return {
    customerId: null,
    date,
    durationMinutes: service ? String(service.duration_minutes) : "",
    email: "",
    masterNote: "",
    name: "",
    phone: "",
    priceAmount: service ? String(service.price_amount) : "",
    serviceId: service?.id ?? "",
    startsAt: "",
  };
}

function validationMessage(
  error: ManualBookingValidationError,
  t: ManualBookingModalProps["t"],
): string {
  const keys: Record<ManualBookingValidationError, MessageKey> = {
    date: "mobile.manualBookingDateInvalid",
    duration: "mobile.manualBookingDurationInvalid",
    email: "mobile.manualBookingEmailInvalid",
    name: "mobile.manualBookingNameRequired",
    price: "mobile.manualBookingPriceInvalid",
    slot: "mobile.manualBookingTimeRequired",
  };
  return t(keys[error]);
}

function serverErrorMessage(
  error: unknown,
  t: ManualBookingModalProps["t"],
): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("no longer available")) {
    return t("mobile.manualBookingConflict");
  }
  return t("common.error");
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8, marginTop: 20 },
  activeModeButton: { backgroundColor: colors.action },
  activeModeButtonText: { color: colors.actionText },
  backdrop: {
    alignItems: "center",
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    flex: 1,
    maxHeight: "94%",
    maxWidth: 480,
    padding: 20,
    width: "100%",
    ...shadows.surface,
  },
  closeButton: { padding: 4 },
  closeButtonText: {
    color: colors.secondaryText,
    fontSize: 28,
    lineHeight: 28,
  },
  customerCopy: { flex: 1, gap: 2 },
  customerList: { gap: 6, marginTop: 8 },
  customerName: { ...typography.label, color: colors.primaryText },
  customerRow: {
    alignItems: "center",
    borderColor: colors.borderSubtle,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  customerSection: { gap: 4 },
  description: {
    ...typography.body,
    color: colors.secondaryText,
    marginTop: 6,
  },
  disabled: { opacity: 0.6 },
  error: { ...typography.caption, color: colors.danger, marginTop: 12 },
  field: { gap: 6, marginTop: 14 },
  form: { paddingBottom: 8 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  headerCopy: { flex: 1 },
  helper: { ...typography.caption, color: colors.secondaryText },
  input: {
    ...typography.body,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.primaryText,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputError: { borderColor: colors.danger, borderWidth: 1 },
  label: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "600",
  },
  modeButton: {
    alignItems: "center",
    borderRadius: radii.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 8,
  },
  modeButtonText: {
    ...typography.caption,
    color: colors.primaryText,
    textAlign: "center",
  },
  multilineInput: { minHeight: 76, textAlignVertical: "top" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  primaryButtonPressed: { backgroundColor: colors.actionPressed },
  primaryButtonText: { ...typography.label, color: colors.actionText },
  row: { flexDirection: "row", gap: 8 },
  rowField: { flex: 1 },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: { ...typography.label, color: colors.primaryText },
  selectedCustomerRow: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  selectedMark: { color: colors.accent, fontSize: 18, fontWeight: "700" },
  selectedSlot: { backgroundColor: colors.action, borderColor: colors.action },
  selectedSlotText: { color: colors.actionText },
  serviceCard: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    gap: 4,
    marginTop: 14,
    padding: 12,
  },
  serviceName: {
    ...typography.body,
    color: colors.primaryText,
    fontWeight: "600",
  },
  slot: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  slotText: { ...typography.label, color: colors.primaryText },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  segmentedControl: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 4,
    marginTop: 16,
    padding: 4,
  },
  title: { ...typography.section, color: colors.primaryText },
});
