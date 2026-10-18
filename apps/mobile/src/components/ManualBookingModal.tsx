import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatCurrency, formatDate, formatTime } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  createMasterRecurringBookings,
  listMasterAvailableSlots,
  listMasterCustomers,
  type ManualBookingCustomer,
  type ManualBookingDraft,
  type ManualBookingValidationError,
  previewMasterRecurringBookings,
  type RecurringAppointmentPreview,
  validateManualBookingDraft,
} from "../features/appointments/manualBooking";
import {
  getInitialManualBookingStep,
  type ManualBookingStep,
  manualBookingStepIndex,
  nextManualBookingStep,
  previousManualBookingStep,
} from "../features/appointments/manualBookingFlow";
import type { CustomerProfile } from "../features/customers/customerDirectory";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service, Workspace } from "../types";
import { ActionButton } from "./ActionButton";
import { DateTimePickerField } from "./DateTimePickerField";
import { FullscreenModal } from "./FullscreenModal";
import { ManualBookingServicesField } from "./ManualBookingServicesField";

type ManualBookingModalProps = {
  readonly client: SupabaseClient<Database>;
  readonly initialDate: string;
  readonly initialStartsAt?: string;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onCreated: (appointmentId: string) => Promise<void>;
  readonly initialServiceId?: string;
  readonly initialCustomer?: Pick<
    CustomerProfile,
    "email" | "name" | "phone"
  > & { readonly id: string | null };
  readonly services: readonly Service[];
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
  readonly workspace: Workspace;
};

export function ManualBookingModal({
  client,
  initialDate,
  initialStartsAt,
  locale,
  initialCustomer,
  onClose,
  onCreated,
  initialServiceId,
  services,
  t,
  visible,
  workspace,
}: ManualBookingModalProps) {
  const [draft, setDraft] = useState<ManualBookingDraft>(() =>
    createInitialDraft(
      services.find((service) => service.id === initialServiceId) ??
        services[0] ??
        null,
      initialDate,
    ),
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
  const [isRecurring, setRecurring] = useState(false);
  const [recurrenceIntervalWeeks, setRecurrenceIntervalWeeks] = useState(1);
  const [recurrenceEndMode, setRecurrenceEndMode] = useState<"count" | "date">(
    "count",
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(() =>
    addDaysToDate(initialDate, 21),
  );
  const [recurrenceOccurrenceCount, setRecurrenceOccurrenceCount] =
    useState("4");
  const [recurrencePreview, setRecurrencePreview] = useState<
    RecurringAppointmentPreview[]
  >([]);
  const [excludedRecurrenceDates, setExcludedRecurrenceDates] = useState<
    string[]
  >([]);
  const [isLoadingRecurrencePreview, setLoadingRecurrencePreview] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] =
    useState<ManualBookingValidationError | null>(null);
  const initializedKey = useRef<string | null>(null);
  const recurrencePreviewRequest = useRef(0);

  const selectedServices = draft.serviceIds
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service));
  const serviceIdsForAvailability = useMemo(
    () => [...draft.serviceIds],
    [draft.serviceIds],
  );
  const initialSlotResolved = useRef(false);
  const recurrenceCount =
    recurrenceEndMode === "count"
      ? Math.max(2, Math.min(24, Number(recurrenceOccurrenceCount) || 4))
      : getRecurrenceCountThroughDate(
          draft.date,
          recurrenceEndDate,
          recurrenceIntervalWeeks,
        );

  useEffect(() => {
    if (!visible) {
      initializedKey.current = null;
      setRecurring(false);
      setRecurrenceIntervalWeeks(1);
      setRecurrenceEndMode("count");
      setRecurrenceEndDate(addDaysToDate(initialDate, 21));
      setRecurrenceOccurrenceCount("4");
      setExcludedRecurrenceDates([]);
      setRecurrencePreview([]);
      return;
    }
    const defaultServiceId =
      services.find((service) => service.id === initialServiceId)?.id ??
      services[0]?.id ??
      "";
    const nextKey = `${initialDate}:${initialStartsAt ?? ""}:${initialServiceId ?? defaultServiceId}:${initialCustomer?.id ?? ""}`;
    if (initializedKey.current === nextKey) return;
    initializedKey.current = nextKey;
    setDraft({
      ...createInitialDraft(
        services.find((service) => service.id === initialServiceId) ??
          services[0] ??
          null,
        initialDate,
        initialStartsAt,
      ),
      customerId: initialCustomer?.id ?? null,
      email: initialCustomer?.email ?? "",
      name: initialCustomer?.name ?? "",
      phone: initialCustomer?.phone ?? "",
    });
    setStep(
      getInitialManualBookingStep({
        hasCustomer: Boolean(initialCustomer),
        hasStartsAt: Boolean(initialStartsAt),
      }),
    );
    setCustomerSearch("");
    setExistingCustomer(true);
    setCustomers([]);
    setSlots([]);
    initialSlotResolved.current = false;
    setError(null);
    setValidationError(null);
    setIdempotencyKey(createIdempotencyKey());
  }, [
    initialCustomer,
    initialDate,
    initialServiceId,
    initialStartsAt,
    services,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !isExistingCustomer || step !== "customer") return;
    let active = true;
    setLoadingCustomers(true);
    void listMasterCustomers(client, workspace.id, customerSearch)
      .then((nextCustomers) => {
        if (!active) return;
        setCustomers(nextCustomers);
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
    if (
      !visible ||
      !isRecurring ||
      step !== "review" ||
      !draft.startsAt ||
      !serviceIdsForAvailability.length ||
      recurrenceCount < 2
    ) {
      setRecurrencePreview([]);
      setExcludedRecurrenceDates([]);
      setLoadingRecurrencePreview(false);
      return;
    }
    const request = ++recurrencePreviewRequest.current;
    setLoadingRecurrencePreview(true);
    setExcludedRecurrenceDates([]);
    const timeout = setTimeout(() => {
      void previewMasterRecurringBookings(
        client,
        workspace.id,
        serviceIdsForAvailability,
        draft.startsAt,
        recurrenceIntervalWeeks,
        recurrenceCount,
      )
        .then((preview) => {
          if (recurrencePreviewRequest.current !== request) return;
          setRecurrencePreview(preview);
        })
        .catch(() => {
          if (recurrencePreviewRequest.current === request) {
            setRecurrencePreview([]);
            setError(t("mobile.recurringPreviewFailed"));
          }
        })
        .finally(() => {
          if (recurrencePreviewRequest.current === request) {
            setLoadingRecurrencePreview(false);
          }
        });
    }, 200);
    return () => {
      clearTimeout(timeout);
      recurrencePreviewRequest.current += 1;
    };
  }, [
    client,
    draft.startsAt,
    isRecurring,
    recurrenceCount,
    recurrenceIntervalWeeks,
    serviceIdsForAvailability,
    step,
    t,
    visible,
    workspace.id,
  ]);

  useEffect(() => {
    if (!visible || !serviceIdsForAvailability.length || !draft.date) return;
    let active = true;
    setLoadingSlots(true);
    setSlots([]);
    setDraft((current) => ({ ...current, startsAt: "" }));
    void listMasterAvailableSlots(
      client,
      workspace.id,
      serviceIdsForAvailability,
      draft.date,
    )
      .then((nextSlots) => {
        if (!active) return;
        setSlots(nextSlots);
        if (initialStartsAt && !initialSlotResolved.current) {
          const matchingSlot = nextSlots.find((slot) =>
            sameInstant(slot.starts_at, initialStartsAt),
          );
          setDraft((current) => ({
            ...current,
            startsAt: matchingSlot?.starts_at ?? "",
          }));
          initialSlotResolved.current = true;
        }
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
  }, [
    client,
    draft.date,
    initialStartsAt,
    serviceIdsForAvailability,
    t,
    visible,
    workspace.id,
  ]);

  function updateDraft(patch: Partial<ManualBookingDraft>) {
    if (patch.date && recurrenceEndDate < patch.date) {
      setRecurrenceEndDate(
        addDaysToDate(patch.date, recurrenceIntervalWeeks * 7),
      );
    }
    setDraft((current) => ({ ...current, ...patch }));
    setIdempotencyKey(createIdempotencyKey());
    setValidationError(null);
    setError(null);
  }

  function selectServices(serviceIds: string[]) {
    updateDraft({ serviceIds, startsAt: "" });
    setStep("time");
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
        nextValidationError === "services" ||
        nextValidationError === "serviceLimit"
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
        ["date", "slot", "services", "serviceLimit"].includes(
          nextValidationError,
        )
          ? "time"
          : "customer",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const appointmentIds = isRecurring
        ? await createMasterRecurringBookings(
            client,
            workspace.id,
            draft,
            recurrenceIntervalWeeks,
            recurrenceCount,
            excludedRecurrenceDates,
            `${idempotencyKey}-series`,
          )
        : [
            (
              await createMasterBooking(
                client,
                workspace.id,
                draft,
                idempotencyKey,
              )
            ).id as string,
          ];
      if (!appointmentIds[0]) throw new Error("Booking response is invalid");
      await onCreated(appointmentIds[0]);
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
      closeIcon={step === "time" ? "close" : "chevron-left"}
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
              disabled={
                isLoadingSlots || !selectedServices.length || !draft.startsAt
              }
              label={t("common.next")}
              onPress={handleNext}
              variant="primary"
            />
          ) : step === "customer" ? (
            <ActionButton
              label={t("common.next")}
              onPress={handleNext}
              variant="primary"
            />
          ) : (
            <ActionButton
              disabled={
                isSaving ||
                (isRecurring &&
                  (isLoadingRecurrencePreview ||
                    recurrenceCount < 2 ||
                    recurrencePreview.length !== recurrenceCount ||
                    recurrencePreview.every(
                      (item) =>
                        !item.available ||
                        excludedRecurrenceDates.includes(item.local_date),
                    )))
              }
              label={t("mobile.manualBookingCreate")}
              loading={isSaving}
              loadingLabel={t("common.loading")}
              onPress={() => void handleSubmit()}
              variant="primary"
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
              onChangeServices={selectServices}
              onSelectSlot={(startsAt) => updateDraft({ startsAt })}
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
            <ReviewStep
              draft={draft}
              locale={locale}
              selectedServices={selectedServices}
              slots={slots}
              t={t}
              workspace={workspace}
            />
          )}

          {step === "review" ? (
            <>
              <Field
                label={t("mobile.manualBookingNote")}
                multiline
                onChangeText={(masterNote) => updateDraft({ masterNote })}
                placeholder={t("mobile.manualBookingNotePlaceholder")}
                value={draft.masterNote}
              />
              <View style={styles.recurrence}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isRecurring }}
                  onPress={() => setRecurring((value) => !value)}
                  style={styles.recurrenceToggle}
                >
                  <Text style={styles.label}>
                    {t("mobile.recurringBooking")}
                  </Text>
                  <MaterialCommunityIcons
                    color={isRecurring ? colors.accent : colors.secondaryText}
                    name={
                      isRecurring ? "checkbox-marked" : "checkbox-blank-outline"
                    }
                    size={24}
                  />
                </Pressable>
                {isRecurring ? (
                  <>
                    <Text style={styles.helper}>
                      {t("mobile.recurringBookingHint")}
                    </Text>
                    <View style={styles.recurrenceOptions}>
                      <ModeButton
                        active={recurrenceIntervalWeeks === 1}
                        label={t("mobile.recurringWeekly")}
                        onPress={() => setRecurrenceIntervalWeeks(1)}
                      />
                      <ModeButton
                        active={recurrenceIntervalWeeks === 2}
                        label={t("mobile.recurringBiweekly")}
                        onPress={() => setRecurrenceIntervalWeeks(2)}
                      />
                    </View>
                    <View style={styles.recurrenceOptions}>
                      <ModeButton
                        active={recurrenceEndMode === "count"}
                        label={t("mobile.recurringByCount")}
                        onPress={() => setRecurrenceEndMode("count")}
                      />
                      <ModeButton
                        active={recurrenceEndMode === "date"}
                        label={t("mobile.recurringByDate")}
                        onPress={() => setRecurrenceEndMode("date")}
                      />
                    </View>
                    {recurrenceEndMode === "count" ? (
                      <Field
                        keyboardType="number-pad"
                        label={t("mobile.recurringOccurrenceCount")}
                        onChangeText={(value) =>
                          setRecurrenceOccurrenceCount(
                            value.replace(/[^0-9]/g, "").slice(0, 2),
                          )
                        }
                        placeholder="4"
                        value={recurrenceOccurrenceCount}
                      />
                    ) : (
                      <DateTimePickerField
                        label={t("mobile.recurringEndDate")}
                        locale={locale}
                        mode="date"
                        onChange={setRecurrenceEndDate}
                        placeholder={t("mobile.recurringEndDate")}
                        t={t}
                        value={recurrenceEndDate}
                      />
                    )}
                    {isLoadingRecurrencePreview ? (
                      <View style={styles.previewState}>
                        <ActivityIndicator color={colors.accent} />
                        <Text style={styles.helper}>{t("common.loading")}</Text>
                      </View>
                    ) : recurrenceCount < 2 ? (
                      <Text accessibilityRole="alert" style={styles.error}>
                        {t("mobile.recurringInvalidEndDate")}
                      </Text>
                    ) : (
                      <View style={styles.recurrencePreview}>
                        {recurrencePreview.map((item) => {
                          const excluded = excludedRecurrenceDates.includes(
                            item.local_date,
                          );
                          return (
                            <View
                              key={item.local_date}
                              style={styles.recurrencePreviewRow}
                            >
                              <View style={styles.recurrencePreviewCopy}>
                                <Text style={styles.recurrenceDate}>
                                  {formatDate(
                                    new Date(
                                      `${item.local_date}T12:00:00.000Z`,
                                    ),
                                    locale,
                                    {
                                      day: "numeric",
                                      month: "short",
                                      timeZone: "UTC",
                                    },
                                  )}
                                  {" · "}
                                  {formatTime(
                                    new Date(item.starts_at),
                                    locale,
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      timeZone: workspace.timezone,
                                    },
                                  )}
                                </Text>
                                {!item.available ? (
                                  <Text style={styles.conflictText}>
                                    {t("mobile.recurringConflict")}
                                  </Text>
                                ) : null}
                              </View>
                              {!item.available ? (
                                <Pressable
                                  accessibilityRole="checkbox"
                                  accessibilityState={{ checked: excluded }}
                                  onPress={() =>
                                    setExcludedRecurrenceDates((current) =>
                                      excluded
                                        ? current.filter(
                                            (date) => date !== item.local_date,
                                          )
                                        : [...current, item.local_date],
                                    )
                                  }
                                  style={styles.skipDateButton}
                                >
                                  <Text style={styles.skipDateLabel}>
                                    {t(
                                      excluded
                                        ? "mobile.recurringDateSkipped"
                                        : "mobile.recurringSkipDate",
                                    )}
                                  </Text>
                                </Pressable>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </>
                ) : null}
              </View>
            </>
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
  onChangeServices,
  onSelectSlot,
  services,
  slots,
  t,
  workspace,
}: {
  readonly draft: ManualBookingDraft;
  readonly isLoadingSlots: boolean;
  readonly locale: SupportedLocale;
  readonly onChangeDate: (date: string) => void;
  readonly onChangeServices: (serviceIds: string[]) => void;
  readonly onSelectSlot: (startsAt: string) => void;
  readonly services: readonly Service[];
  readonly slots: readonly AvailableSlot[];
  readonly t: (key: MessageKey) => string;
  readonly workspace: Workspace;
}) {
  return (
    <View>
      {services.length ? (
        <ManualBookingServicesField
          locale={locale}
          onChange={onChangeServices}
          services={services}
          serviceIds={draft.serviceIds}
          t={t}
        />
      ) : (
        <Text style={styles.helper}>{t("mobile.noServices")}</Text>
      )}

      <View style={styles.dateField}>
        <DateTimePickerField
          label={t("mobile.manualBookingDate")}
          locale={locale}
          mode="date"
          onChange={onChangeDate}
          placeholder={t("mobile.personalBlockDatePlaceholder")}
          t={t}
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
                  accessibilityState={{ selected: isSelected }}
                  key={slot.starts_at}
                  onPress={() => onSelectSlot(slot.starts_at)}
                  style={[styles.slot, isSelected && styles.selectedSlot]}
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    numberOfLines={1}
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
  locale,
  selectedServices,
  slots,
  t,
  workspace,
}: {
  readonly draft: ManualBookingDraft;
  readonly locale: SupportedLocale;
  readonly selectedServices: readonly Service[];
  readonly slots: readonly AvailableSlot[];
  readonly t: (key: MessageKey) => string;
  readonly workspace: Workspace;
}) {
  const selectedSlot = slots.find((slot) =>
    sameInstant(slot.starts_at, draft.startsAt),
  );
  const duration = selectedServices.reduce(
    (total, service) => total + service.duration_minutes,
    0,
  );
  const price = selectedServices.reduce(
    (total, service) => total + service.price_amount,
    0,
  );
  const currency = selectedServices[0]?.currency ?? "CZK";
  const fallbackEndsAt = new Date(
    new Date(draft.startsAt).getTime() + duration * 60_000,
  ).toISOString();
  const endsAt = selectedSlot?.ends_at ?? fallbackEndsAt;
  const rows = [
    [
      t("mobile.manualBookingService"),
      selectedServices.map((service) => service.name).join(" + ") ||
        t("mobile.noServices"),
    ],
    [t("mobile.manualBookingCustomerName"), draft.name],
    [t("mobile.manualBookingDate"), draft.date],
    [
      t("mobile.manualBookingTime"),
      `${formatTime(new Date(draft.startsAt), locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: workspace.timezone,
      })}–${formatTime(new Date(endsAt), locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: workspace.timezone,
      })}`,
    ],
    [t("mobile.manualBookingDuration"), `${duration} min`],
    [t("mobile.manualBookingPrice"), formatCurrency(price, locale, currency)],
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

function createInitialDraft(
  service: Service | null,
  date: string,
  startsAt?: string,
): ManualBookingDraft {
  return {
    customerId: null,
    date,
    email: "",
    masterNote: "",
    name: "",
    phone: "",
    serviceIds: service ? [service.id] : [],
    startsAt: startsAt ?? "",
  };
}

function addDaysToDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function getRecurrenceCountThroughDate(
  startDate: string,
  endDate: string,
  intervalWeeks: number,
): number {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.min(
    24,
    Math.floor((end - start) / (intervalWeeks * 7 * 86400000)) + 1,
  );
}

function sameInstant(left: string, right: string): boolean {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime) && leftTime === rightTime;
}

function validationMessage(
  error: ManualBookingValidationError,
  t: ManualBookingModalProps["t"],
): string {
  const keys: Record<ManualBookingValidationError, MessageKey> = {
    date: "mobile.manualBookingDateInvalid",
    email: "mobile.manualBookingEmailInvalid",
    name: "mobile.manualBookingNameRequired",
    services: "mobile.manualBookingServicesRequired",
    serviceLimit: "mobile.manualBookingServiceLimitReached",
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
    height: 48,
    paddingHorizontal: 16,
    paddingVertical: 0,
    textAlignVertical: "center",
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
    minHeight: 44,
    paddingHorizontal: 8,
  },
  modeButtonText: {
    ...typography.caption,
    color: colors.primaryText,
    textAlign: "center",
  },
  multilineInput: {
    borderRadius: radii.surface,
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  optionCopy: { flex: 1, gap: 2 },
  optionList: { gap: 8, marginTop: 8 },
  optionRow: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    padding: 14,
  },
  optionTitle: { ...typography.label, color: colors.primaryText },
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
  recurrence: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.surface,
    gap: 10,
    marginTop: 16,
    padding: 12,
  },
  recurrenceDate: { ...typography.label, color: colors.primaryText },
  recurrencePreview: {
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recurrencePreviewCopy: { flex: 1, gap: 2 },
  recurrencePreviewRow: {
    alignItems: "center",
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingBottom: 6,
  },
  recurrenceOptions: {
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 4,
  },
  recurrenceToggle: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  conflictText: { ...typography.caption, color: colors.danger },
  previewState: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 36,
  },
  skipDateButton: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  skipDateLabel: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
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
    flexGrow: 0,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 10,
    width: "31%",
  },
  slotText: {
    ...typography.label,
    color: colors.primaryText,
    textAlign: "center",
    width: "100%",
  },
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
    borderColor: colors.border,
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
