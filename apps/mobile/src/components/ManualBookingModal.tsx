import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatTime } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
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
import {
  type ManualBookingStep,
  manualBookingStepIndex,
  nextManualBookingStep,
  previousManualBookingStep,
} from "../features/appointments/manualBookingFlow";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service, Workspace } from "../types";
import { DateTimePickerField } from "./DateTimePickerField";
import { FullscreenModal } from "./FullscreenModal";

type ManualBookingModalProps = {
  readonly client: SupabaseClient<Database>;
  readonly initialDate: string;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onCreated: () => Promise<void>;
  readonly services: readonly Service[];
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
  services,
  t,
  visible,
  workspace,
}: ManualBookingModalProps) {
  const [draft, setDraft] = useState<ManualBookingDraft>(() =>
    createInitialDraft(services[0] ?? null, initialDate),
  );
  const [step, setStep] = useState<ManualBookingStep>("time");
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
  const initializedDate = useRef<string | null>(null);

  const selectedService =
    services.find((service) => service.id === draft.serviceId) ??
    services[0] ??
    null;
  const selectedServiceId = selectedService?.id;

  useEffect(() => {
    if (!visible) {
      initializedDate.current = null;
      return;
    }
    if (initializedDate.current === initialDate) return;
    initializedDate.current = initialDate;
    setDraft(createInitialDraft(services[0] ?? null, initialDate));
    setStep("time");
    setCustomerSearch("");
    setExistingCustomer(true);
    setCustomers([]);
    setSlots([]);
    setError(null);
    setValidationError(null);
    setIdempotencyKey(createIdempotencyKey());
  }, [initialDate, services, visible]);

  useEffect(() => {
    if (!visible || !isExistingCustomer || step !== "customer") return;
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
  }, [
    client,
    customerSearch,
    isExistingCustomer,
    step,
    t,
    visible,
    workspace.id,
  ]);

  useEffect(() => {
    if (!visible || !selectedServiceId || !draft.date) return;
    let active = true;
    setLoadingSlots(true);
    setSlots([]);
    setDraft((current) => ({ ...current, startsAt: "" }));
    void listMasterAvailableSlots(
      client,
      workspace.id,
      selectedServiceId,
      draft.date,
    )
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
  }, [client, draft.date, selectedServiceId, t, visible, workspace.id]);

  function updateDraft(patch: Partial<ManualBookingDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setValidationError(null);
    setError(null);
  }

  function selectService(service: Service) {
    updateDraft({
      durationMinutes: String(service.duration_minutes),
      priceAmount: String(service.price_amount),
      serviceId: service.id,
      startsAt: "",
    });
  }

  function selectCustomer(customer: ManualBookingCustomer) {
    updateDraft({
      customerId: customer.id,
      email: customer.email ?? "",
      name: customer.name,
      phone: customer.phone ?? "",
    });
  }

  function handleBack() {
    if (step === "time") {
      onClose();
      return;
    }
    setStep(previousManualBookingStep(step));
    setValidationError(null);
    setError(null);
  }

  function handleNext() {
    const nextValidationError = validateManualBookingDraft(draft);
    if (step === "time") {
      if (
        nextValidationError === "date" ||
        nextValidationError === "slot" ||
        nextValidationError === "duration" ||
        nextValidationError === "price"
      ) {
        setValidationError(nextValidationError);
        return;
      }
    }
    if (step === "customer") {
      if (nextValidationError === "name" || nextValidationError === "email") {
        setValidationError(nextValidationError);
        return;
      }
    }
    setValidationError(null);
    setError(null);
    setStep(nextManualBookingStep(step));
  }

  async function handleSubmit() {
    const nextValidationError = validateManualBookingDraft(draft);
    setValidationError(nextValidationError);
    if (nextValidationError) {
      setStep(
        ["date", "slot", "duration", "price"].includes(nextValidationError)
          ? "time"
          : "customer",
      );
      return;
    }

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
  const stepLabels = [
    t("mobile.manualBookingStepTime"),
    t("mobile.manualBookingStepCustomer"),
    t("mobile.manualBookingStepReview"),
  ];

  return (
    <FullscreenModal
      closeLabel={step === "time" ? t("common.cancel") : t("common.back")}
      closeDisabled={isSaving}
      onClose={handleBack}
      title={t("mobile.manualBookingTitle")}
      visible={visible}
      footer={
        <View style={styles.footerContent}>
          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}
          {step === "time" ? (
            <ActionButton
              disabled={isLoadingSlots || !selectedService || !draft.startsAt}
              label={t("common.next")}
              onPress={handleNext}
              primary
            />
          ) : step === "customer" ? (
            <ActionButton
              label={t("common.next")}
              onPress={handleNext}
              primary
            />
          ) : (
            <ActionButton
              disabled={isSaving}
              label={
                isSaving ? t("common.loading") : t("mobile.manualBookingCreate")
              }
              onPress={() => void handleSubmit()}
              primary
            />
          )}
        </View>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.body}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.progress}>
            {stepLabels.map((label, index) => (
              <View key={label} style={styles.progressItem}>
                <View
                  style={[
                    styles.progressDot,
                    index <= manualBookingStepIndex(step) &&
                      styles.progressDotActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.progressNumber,
                      index <= manualBookingStepIndex(step) &&
                        styles.progressNumberActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text style={styles.progressLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.description}>
            {step === "time"
              ? t("mobile.manualBookingTimeDescription")
              : step === "customer"
                ? t("mobile.manualBookingCustomerDescription")
                : t("mobile.manualBookingReviewDescription")}
          </Text>

          {step === "time" ? (
            <TimeStep
              draft={draft}
              isLoadingSlots={isLoadingSlots}
              locale={locale}
              onChangeDate={(date) => updateDraft({ date })}
              onSelectService={selectService}
              onSelectSlot={(startsAt) => updateDraft({ startsAt })}
              selectedService={selectedService}
              services={services}
              slots={slots}
              t={t}
              workspace={workspace}
            />
          ) : step === "customer" ? (
            <CustomerStep
              customers={customers}
              customerSearch={customerSearch}
              draft={draft}
              isExistingCustomer={isExistingCustomer}
              isLoadingCustomers={isLoadingCustomers}
              onChangeSearch={setCustomerSearch}
              onSelectCustomer={selectCustomer}
              onSetExisting={(existing) => {
                setExistingCustomer(existing);
                updateDraft(
                  existing
                    ? { customerId: null }
                    : { customerId: null, email: "", name: "", phone: "" },
                );
              }}
              selectedCustomerId={selectedCustomerId}
              t={t}
              updateDraft={updateDraft}
              validationError={validationError}
            />
          ) : (
            <ReviewStep draft={draft} selectedService={selectedService} t={t} />
          )}

          {step === "review" ? (
            <Field
              label={t("mobile.manualBookingNote")}
              multiline
              onChangeText={(masterNote) => updateDraft({ masterNote })}
              placeholder={t("mobile.manualBookingNotePlaceholder")}
              value={draft.masterNote}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </FullscreenModal>
  );
}

function TimeStep({
  draft,
  isLoadingSlots,
  locale,
  onChangeDate,
  onSelectService,
  onSelectSlot,
  selectedService,
  services,
  slots,
  t,
  workspace,
}: {
  readonly draft: ManualBookingDraft;
  readonly isLoadingSlots: boolean;
  readonly locale: SupportedLocale;
  readonly onChangeDate: (date: string) => void;
  readonly onSelectService: (service: Service) => void;
  readonly onSelectSlot: (startsAt: string) => void;
  readonly selectedService: Service | null;
  readonly services: readonly Service[];
  readonly slots: readonly AvailableSlot[];
  readonly t: (key: MessageKey) => string;
  readonly workspace: Workspace;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>
        {t("mobile.manualBookingService")}
      </Text>
      {services.length ? (
        <View style={styles.optionList}>
          {services.map((service) => (
            <Pressable
              accessibilityRole="button"
              key={service.id}
              onPress={() => onSelectService(service)}
              style={[
                styles.optionRow,
                selectedService?.id === service.id && styles.selectedOptionRow,
              ]}
            >
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{service.name}</Text>
                <Text style={styles.helper}>
                  {service.duration_minutes} min · {service.price_amount}{" "}
                  {service.currency}
                </Text>
              </View>
              {selectedService?.id === service.id ? (
                <Text style={styles.selectedMark}>✓</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.helper}>{t("mobile.noServices")}</Text>
      )}

      <View style={styles.dateField}>
        <DateTimePickerField
          label={t("mobile.manualBookingDate")}
          mode="date"
          onChange={onChangeDate}
          placeholder={t("mobile.personalBlockDatePlaceholder")}
          value={draft.date}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.sectionTitle}>{t("mobile.manualBookingTime")}</Text>
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
                  onPress={() => onSelectSlot(slot.starts_at)}
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
          <Text style={styles.helper}>{t("mobile.manualBookingNoSlots")}</Text>
        )}
      </View>
    </View>
  );
}

function CustomerStep({
  customers,
  customerSearch,
  draft,
  isExistingCustomer,
  isLoadingCustomers,
  onChangeSearch,
  onSelectCustomer,
  onSetExisting,
  selectedCustomerId,
  t,
  updateDraft,
  validationError,
}: {
  readonly customers: readonly ManualBookingCustomer[];
  readonly customerSearch: string;
  readonly draft: ManualBookingDraft;
  readonly isExistingCustomer: boolean;
  readonly isLoadingCustomers: boolean;
  readonly onChangeSearch: (value: string) => void;
  readonly onSelectCustomer: (customer: ManualBookingCustomer) => void;
  readonly onSetExisting: (existing: boolean) => void;
  readonly selectedCustomerId: string | null;
  readonly t: (key: MessageKey) => string;
  readonly updateDraft: (patch: Partial<ManualBookingDraft>) => void;
  readonly validationError: ManualBookingValidationError | null;
}) {
  return (
    <View>
      <View style={styles.segmentedControl}>
        <ModeButton
          active={isExistingCustomer}
          label={t("mobile.manualBookingExistingCustomer")}
          onPress={() => onSetExisting(true)}
        />
        <ModeButton
          active={!isExistingCustomer}
          label={t("mobile.manualBookingNewCustomer")}
          onPress={() => onSetExisting(false)}
        />
      </View>

      {isExistingCustomer ? (
        <View style={styles.customerSection}>
          <Field
            label={t("mobile.manualBookingSearchCustomer")}
            onChangeText={onChangeSearch}
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
                  onPress={() => onSelectCustomer(customer)}
                  style={[
                    styles.optionRow,
                    selectedCustomerId === customer.id &&
                      styles.selectedOptionRow,
                  ]}
                >
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle}>{customer.name}</Text>
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
    </View>
  );
}

function ReviewStep({
  draft,
  selectedService,
  t,
}: {
  readonly draft: ManualBookingDraft;
  readonly selectedService: Service | null;
  readonly t: (key: MessageKey) => string;
}) {
  const rows = [
    [
      t("mobile.manualBookingService"),
      selectedService?.name ?? t("mobile.noServices"),
    ],
    [t("mobile.manualBookingCustomerName"), draft.name],
    [t("mobile.manualBookingDate"), draft.date],
    [t("mobile.manualBookingTime"), draft.startsAt.slice(11, 16)],
    [t("mobile.manualBookingDuration"), `${draft.durationMinutes} min`],
    [
      t("mobile.manualBookingPrice"),
      `${draft.priceAmount} ${selectedService?.currency ?? ""}`,
    ],
  ];

  return (
    <View style={styles.summary}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{label}</Text>
          <Text style={styles.summaryValue}>{value}</Text>
        </View>
      ))}
      {draft.email || draft.phone ? (
        <Text style={styles.helper}>
          {[draft.email, draft.phone].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
    </View>
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

function ActionButton({
  disabled = false,
  label,
  onPress,
  primary = false,
}: {
  readonly disabled?: boolean;
  readonly label: string;
  readonly onPress: () => void;
  readonly primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        primary ? styles.primaryButton : styles.secondaryButton,
        pressed && primary && styles.primaryButtonPressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={primary ? styles.primaryButtonText : styles.secondaryButtonText}
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
  activeModeButton: { backgroundColor: colors.action },
  activeModeButtonText: { color: colors.actionText },
  body: { flex: 1 },
  customerList: { gap: 8, marginTop: 8 },
  customerSection: { gap: 4 },
  dateField: { marginTop: 20 },
  description: {
    ...typography.body,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  disabled: { opacity: 0.6 },
  error: { ...typography.caption, color: colors.danger, marginBottom: 10 },
  field: { gap: 6, marginTop: 16 },
  footerContent: { gap: 4 },
  form: { gap: 4, padding: 20, paddingBottom: 32 },
  helper: { ...typography.caption, color: colors.secondaryText },
  input: {
    ...typography.body,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.primaryText,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    minHeight: 40,
    paddingHorizontal: 8,
  },
  modeButtonText: {
    ...typography.caption,
    color: colors.primaryText,
    textAlign: "center",
  },
  multilineInput: {
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  optionCopy: { flex: 1, gap: 2 },
  optionList: { gap: 8, marginTop: 8 },
  optionRow: {
    alignItems: "center",
    borderColor: colors.borderSubtle,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    padding: 14,
  },
  optionTitle: { ...typography.label, color: colors.primaryText },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonPressed: { backgroundColor: colors.actionPressed },
  primaryButtonText: { ...typography.label, color: colors.actionText },
  progress: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  progressDot: {
    alignItems: "center",
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  progressDotActive: { backgroundColor: colors.accent },
  progressItem: { alignItems: "center", flex: 1, gap: 6 },
  progressLabel: {
    ...typography.caption,
    color: colors.secondaryText,
    textAlign: "center",
  },
  progressNumber: {
    ...typography.caption,
    color: colors.secondaryText,
    fontWeight: "700",
  },
  progressNumberActive: { color: colors.inverse },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  secondaryButtonText: { ...typography.label, color: colors.primaryText },
  sectionTitle: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
    marginTop: 12,
  },
  segmentedControl: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
    padding: 4,
  },
  selectedMark: { color: colors.accent, fontSize: 18, fontWeight: "700" },
  selectedOptionRow: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  selectedSlot: { backgroundColor: colors.action, borderColor: colors.action },
  selectedSlotText: { color: colors.actionText },
  slot: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: "22%",
    flexGrow: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  slotText: { ...typography.label, color: colors.primaryText },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    maxWidth: 540,
    width: "100%",
  },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderRadius: radii.surface,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 0,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  summaryLabel: { ...typography.caption, color: colors.secondaryText },
  summaryRow: {
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  summaryValue: {
    ...typography.label,
    color: colors.primaryText,
    flex: 1,
    textAlign: "right",
  },
});
