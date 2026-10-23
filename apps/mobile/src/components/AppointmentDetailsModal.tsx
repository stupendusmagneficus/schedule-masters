import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import {
  formatCurrency,
  formatDate,
  formatDuration,
  formatTime,
} from "@schedule-app/i18n";
import { type ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getAppointmentStatusActions } from "../features/appointments/appointmentActions";
import type {
  AppointmentStatus,
  FutureSeriesAppointment,
  MasterAppointment,
} from "../features/appointments/manualBooking";
import { parseAppointmentPayment } from "../features/finance/appointmentPayment";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "./AppointmentStatusBadge";
import { FullscreenModal } from "./FullscreenModal";
import { InfoCard } from "./InfoCard";

type AppointmentDetailsModalProps = {
  readonly emailStatus?: ReactNode;
  readonly appointment: MasterAppointment | null;
  readonly error: string | null;
  readonly isSaving: boolean;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onStatusChange: (status: AppointmentStatus) => Promise<void>;
  readonly onPaymentSave?: (amount: number) => Promise<boolean>;
  readonly onNoteSave?: (note: string) => Promise<boolean>;
  readonly onCancelFutureSeries?: () => Promise<boolean>;
  readonly onLoadFutureSeriesAppointments?: () => Promise<
    FutureSeriesAppointment[]
  >;
  readonly customerPhone: string | null;
  readonly customerContactLoading: boolean;
  readonly customerContactError: boolean;
  readonly onRetryCustomerContact: () => void;
  readonly onCallCustomer: () => void;
  readonly onTextCustomer: () => void;
  readonly onShare?: (customerConsentConfirmed: boolean) => Promise<boolean>;
  readonly t: (key: MessageKey) => string;
  readonly timezone: string;
  readonly visible: boolean;
};

type StatusConfirmation = {
  readonly appointmentId: string;
  readonly appointmentStatus: AppointmentStatus;
  readonly status: AppointmentStatus;
};

export function AppointmentDetailsModal({
  emailStatus,
  appointment,
  error,
  isSaving,
  locale,
  onClose,
  onStatusChange,
  onPaymentSave,
  onNoteSave,
  onCancelFutureSeries,
  onLoadFutureSeriesAppointments,
  customerPhone,
  customerContactLoading,
  customerContactError,
  onRetryCustomerContact,
  onCallCustomer,
  onTextCustomer,
  t,
  timezone,
  onShare,
  visible,
}: AppointmentDetailsModalProps) {
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "opened" | "failed">(
    "idle",
  );
  const [paymentDraft, setPaymentDraft] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState(appointment?.master_note ?? "");
  const [noteMessage, setNoteMessage] = useState<string | null>(null);
  const [isSavingNote, setSavingNote] = useState(false);
  const [confirmSeriesCancellation, setConfirmSeriesCancellation] =
    useState(false);
  const [seriesCancellationError, setSeriesCancellationError] = useState(false);
  const [futureSeriesAppointments, setFutureSeriesAppointments] = useState<
    FutureSeriesAppointment[]
  >([]);
  const [isLoadingFutureSeries, setLoadingFutureSeries] = useState(false);
  const [futureSeriesLoadError, setFutureSeriesLoadError] = useState(false);
  useEffect(() => {
    setNoteDraft(appointment?.master_note ?? "");
    setNoteMessage(null);
  }, [appointment?.master_note]);
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(
    null,
  );
  const [statusConfirmation, setStatusConfirmation] =
    useState<StatusConfirmation | null>(null);
  const activeStatusConfirmation =
    statusConfirmation &&
    appointment &&
    statusConfirmation.appointmentId === appointment.id &&
    statusConfirmation.appointmentStatus === appointment.status
      ? statusConfirmation
      : null;
  const actions = appointment
    ? getAppointmentStatusActions(appointment.status, t)
    : [];

  async function loadFutureSeriesAppointments() {
    if (!onLoadFutureSeriesAppointments) return;
    setLoadingFutureSeries(true);
    setFutureSeriesLoadError(false);
    try {
      setFutureSeriesAppointments(await onLoadFutureSeriesAppointments());
    } catch {
      setFutureSeriesLoadError(true);
    } finally {
      setLoadingFutureSeries(false);
    }
  }

  async function saveStatus(status: AppointmentStatus) {
    setPendingStatus(status);
    try {
      await onStatusChange(status);
    } finally {
      setPendingStatus(null);
    }
  }

  return (
    <FullscreenModal
      closeDisabled={isSaving}
      closeLabel={t("common.cancel")}
      onClose={() => {
        setStatusConfirmation(null);
        onClose();
      }}
      title={t("mobile.appointmentDetails")}
      visible={visible}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {appointment ? (
          <>
            <InfoCard>
              <View style={styles.header}>
                <View style={styles.nameRow}>
                  <Text style={styles.customerName}>
                    {appointment.customer_name}
                  </Text>
                  {customerContactLoading ? (
                    <View style={styles.contactLoading}>
                      <ActivityIndicator
                        accessibilityLabel={t("mobile.customerContactLoading")}
                        color={colors.secondaryText}
                        size="small"
                      />
                    </View>
                  ) : customerContactError ? (
                    <Pressable
                      accessibilityLabel={`${t("mobile.customerContactLoadFailed")} ${t("common.retry")}`}
                      accessibilityRole="button"
                      onPress={onRetryCustomerContact}
                      style={({ pressed }) => [
                        styles.iconAction,
                        pressed && styles.pressed,
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={colors.secondaryText}
                        name="refresh"
                        size={22}
                      />
                    </Pressable>
                  ) : customerPhone ? (
                    <View style={styles.contactActions}>
                      <Pressable
                        accessibilityHint={customerPhone}
                        accessibilityLabel={t("mobile.customerCall")}
                        accessibilityRole="button"
                        onPress={onCallCustomer}
                        style={({ pressed }) => [
                          styles.iconAction,
                          pressed && styles.pressed,
                        ]}
                      >
                        <MaterialCommunityIcons
                          color={colors.primaryText}
                          name="phone-outline"
                          size={22}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityHint={customerPhone}
                        accessibilityLabel={t("mobile.customerSms")}
                        accessibilityRole="button"
                        onPress={onTextCustomer}
                        style={({ pressed }) => [
                          styles.iconAction,
                          pressed && styles.pressed,
                        ]}
                      >
                        <MaterialCommunityIcons
                          color={colors.primaryText}
                          name="message-text-outline"
                          size={22}
                        />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
                <View style={styles.serviceStatusRow}>
                  <Text style={styles.serviceName}>
                    {appointment.service_name}
                  </Text>
                  <AppointmentStatusBadge
                    label={getAppointmentStatusLabel(appointment.status, t)}
                    status={appointment.status}
                  />
                </View>
              </View>
              <View style={styles.details}>
                <DetailRow
                  label={t("mobile.appointmentDate")}
                  value={formatDate(new Date(appointment.starts_at), locale, {
                    day: "numeric",
                    month: "long",
                    timeZone: timezone,
                    year: "numeric",
                  })}
                />
                <DetailRow
                  label={t("mobile.appointmentTime")}
                  value={`${formatTime(
                    new Date(appointment.starts_at),
                    locale,
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: timezone,
                    },
                  )} – ${formatTime(new Date(appointment.ends_at), locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: timezone,
                  })}`}
                />
                <DetailRow
                  label={t("mobile.appointmentService")}
                  value={`${appointment.service_name} · ${formatDuration(appointment.duration_minutes, locale)}`}
                />
                <DetailRow
                  label={t("mobile.appointmentPrice")}
                  value={formatCurrency(
                    Number(appointment.price_amount),
                    locale,
                    appointment.currency.trim(),
                  )}
                />
              </View>
            </InfoCard>

            {onNoteSave ? (
              <InfoCard>
                <Text style={styles.sectionTitle}>{t("mobile.visitNote")}</Text>
                <TextInput
                  accessibilityLabel={t("mobile.visitNote")}
                  editable={!isSavingNote}
                  maxLength={1000}
                  multiline
                  onChangeText={(value) => {
                    setNoteDraft(value);
                    setNoteMessage(null);
                  }}
                  placeholder={t("mobile.visitNotePlaceholder")}
                  placeholderTextColor={colors.secondaryText}
                  style={styles.noteInput}
                  textAlignVertical="top"
                  value={noteDraft}
                />
                <ActionButton
                  disabled={
                    isSavingNote ||
                    noteDraft === (appointment.master_note ?? "")
                  }
                  label={t("mobile.visitNoteSave")}
                  loading={isSavingNote}
                  onPress={async () => {
                    setSavingNote(true);
                    const saved = await onNoteSave(noteDraft);
                    setSavingNote(false);
                    setNoteMessage(
                      saved
                        ? t("mobile.visitNoteSaved")
                        : t("mobile.visitNoteSaveFailed"),
                    );
                  }}
                  variant="secondary"
                />
                {noteMessage ? (
                  <Text
                    accessibilityRole={
                      noteMessage === t("mobile.visitNoteSaved")
                        ? undefined
                        : "alert"
                    }
                    style={
                      noteMessage === t("mobile.visitNoteSaved")
                        ? styles.helper
                        : styles.error
                    }
                  >
                    {noteMessage}
                  </Text>
                ) : null}
              </InfoCard>
            ) : null}

            {appointment.appointment_series_id && onCancelFutureSeries ? (
              <InfoCard>
                <Text style={styles.sectionTitle}>
                  {t("mobile.recurringCancelFuture")}
                </Text>
                {confirmSeriesCancellation ? (
                  <>
                    <Text style={styles.helper}>
                      {t("mobile.recurringCancelPrompt")}
                    </Text>
                    {isLoadingFutureSeries ? (
                      <ActivityIndicator color={colors.action} />
                    ) : futureSeriesLoadError ? (
                      <View>
                        <Text accessibilityRole="alert" style={styles.error}>
                          {t("mobile.recurringCancelPreviewFailed")}
                        </Text>
                        <ActionButton
                          label={t("mobile.recurringCancelRetry")}
                          onPress={() => void loadFutureSeriesAppointments()}
                          variant="secondary"
                        />
                      </View>
                    ) : futureSeriesAppointments.length === 0 ? (
                      <Text style={styles.helper}>
                        {t("mobile.recurringCancelNoFuture")}
                      </Text>
                    ) : (
                      <View style={styles.futureSeriesList}>
                        <Text style={styles.detailLabel}>
                          {t("mobile.recurringCancelAffectedTitle")}
                        </Text>
                        {futureSeriesAppointments.map((item) => (
                          <View key={item.id} style={styles.futureSeriesRow}>
                            <Text style={styles.detailValue}>
                              {formatDate(new Date(item.starts_at), locale, {
                                day: "numeric",
                                month: "short",
                                timeZone: timezone,
                              })}{" "}
                              {formatTime(new Date(item.starts_at), locale, {
                                hour: "numeric",
                                minute: "2-digit",
                                timeZone: timezone,
                              })}
                            </Text>
                            <Text style={styles.detailLabel}>
                              {item.service_name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {seriesCancellationError ? (
                      <Text accessibilityRole="alert" style={styles.error}>
                        {t("mobile.recurringCancelFailed")}
                      </Text>
                    ) : null}
                    <View style={styles.confirmationActions}>
                      <ActionButton
                        disabled={isSaving || isLoadingFutureSeries}
                        label={t("common.cancel")}
                        onPress={() => setConfirmSeriesCancellation(false)}
                        style={styles.confirmationAction}
                        variant="quiet"
                      />
                      <ActionButton
                        disabled={
                          isSaving ||
                          isLoadingFutureSeries ||
                          futureSeriesLoadError ||
                          futureSeriesAppointments.length === 0
                        }
                        label={t("mobile.recurringCancelConfirm")}
                        loading={isSaving}
                        onPress={() => {
                          setSeriesCancellationError(false);
                          void onCancelFutureSeries().then((cancelled) => {
                            if (!cancelled) setSeriesCancellationError(true);
                          });
                        }}
                        style={styles.confirmationAction}
                        variant="destructiveConfirm"
                      />
                    </View>
                  </>
                ) : (
                  <ActionButton
                    label={t("mobile.recurringCancelFuture")}
                    onPress={() => {
                      setConfirmSeriesCancellation(true);
                      void loadFutureSeriesAppointments();
                    }}
                    variant="destructive"
                  />
                )}
              </InfoCard>
            ) : null}

            {appointment.status === "completed" && onPaymentSave ? (
              <InfoCard>
                <Text style={styles.sectionTitle}>
                  {t("mobile.paymentReceived")}
                </Text>
                <Text style={styles.helper}>
                  {t("mobile.paymentAmountHint")}:{" "}
                  {formatCurrency(
                    Number(appointment.price_amount),
                    locale,
                    appointment.currency.trim(),
                  )}
                </Text>
                <TextInput
                  accessibilityLabel={t("mobile.paymentReceived")}
                  keyboardType="decimal-pad"
                  onChangeText={(value) => {
                    setPaymentDraft(value);
                    setPaymentMessage(null);
                  }}
                  placeholder="0"
                  style={styles.paymentInput}
                  value={paymentDraft ?? String(appointment.paid_amount ?? 0)}
                />
                <ActionButton
                  disabled={isSaving}
                  label={t("mobile.paymentSave")}
                  loading={isSaving}
                  onPress={async () => {
                    const amount = parseAppointmentPayment(
                      paymentDraft ?? String(appointment.paid_amount ?? 0),
                    );
                    if (amount === null) {
                      setPaymentMessage(t("mobile.paymentAmountInvalid"));
                      return;
                    }
                    const saved = await onPaymentSave(amount);
                    if (saved) {
                      setPaymentDraft(null);
                      setPaymentMessage(t("mobile.paymentSaved"));
                    } else {
                      setPaymentMessage(t("mobile.paymentSaveFailed"));
                    }
                  }}
                  variant="primary"
                />
                {paymentMessage ? (
                  <Text
                    accessibilityRole="alert"
                    style={
                      paymentMessage === t("mobile.paymentSaved")
                        ? styles.helper
                        : styles.error
                    }
                  >
                    {paymentMessage}
                  </Text>
                ) : null}
              </InfoCard>
            ) : null}

            {actions.length > 0 || error ? (
              <View style={styles.actions}>
                {actions.map((action) => (
                  <ActionButton
                    disabled={isSaving || Boolean(activeStatusConfirmation)}
                    label={action.label}
                    loading={isSaving && pendingStatus === action.status}
                    key={action.status}
                    onPress={() => {
                      if (action.variant === "destructive") {
                        setStatusConfirmation({
                          appointmentId: appointment.id,
                          appointmentStatus: appointment.status,
                          status: action.status,
                        });
                      } else {
                        void saveStatus(action.status);
                      }
                    }}
                    variant={action.variant}
                  />
                ))}
                {activeStatusConfirmation ? (
                  <View accessibilityRole="alert" style={styles.confirmation}>
                    <Text style={styles.helper}>
                      {t("mobile.cancelBookingConfirmDescription")}
                    </Text>
                    <View style={styles.confirmationActions}>
                      <ActionButton
                        disabled={isSaving}
                        label={t("common.cancel")}
                        onPress={() => setStatusConfirmation(null)}
                        style={styles.confirmationAction}
                        variant="neutral"
                      />
                      <ActionButton
                        disabled={isSaving}
                        label={t("mobile.cancelBooking")}
                        loading={
                          isSaving &&
                          pendingStatus === activeStatusConfirmation.status
                        }
                        onPress={() => {
                          const confirmation = activeStatusConfirmation;
                          setStatusConfirmation(null);
                          if (confirmation.appointmentId === appointment.id) {
                            void saveStatus(confirmation.status);
                          }
                        }}
                        style={styles.confirmationAction}
                        variant="destructive"
                      />
                    </View>
                  </View>
                ) : null}
                {error ? (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {emailStatus}
            {onShare && actions.length ? (
              <InfoCard>
                <Text style={styles.sectionTitle}>
                  {t("mobile.shareAppointment")}
                </Text>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consentConfirmed }}
                  onPress={() => setConsentConfirmed((value) => !value)}
                  style={styles.consentRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      consentConfirmed && styles.checkboxChecked,
                    ]}
                  >
                    {consentConfirmed ? (
                      <Text style={styles.checkmark}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.helper}>{t("mobile.shareConsent")}</Text>
                </Pressable>
                <ActionButton
                  disabled={isSaving}
                  label={t("mobile.shareAppointment")}
                  loading={isSaving}
                  onPress={async () => {
                    if (!consentConfirmed) {
                      setShareState("failed");
                      return;
                    }
                    setShareState(
                      (await onShare(consentConfirmed)) ? "opened" : "failed",
                    );
                  }}
                  variant="secondary"
                />
                {shareState !== "idle" ? (
                  <Text
                    accessibilityRole={
                      shareState === "failed" ? "alert" : undefined
                    }
                    style={
                      shareState === "failed" ? styles.error : styles.helper
                    }
                  >
                    {shareState === "failed"
                      ? consentConfirmed
                        ? t("mobile.shareSheetFailed")
                        : t("mobile.shareConsentRequired")
                      : t("mobile.shareSheetOpened")}
                  </Text>
                ) : (
                  <Text style={styles.helper}>
                    {t("mobile.shareManualDelivery")}
                  </Text>
                )}
              </InfoCard>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </FullscreenModal>
  );
}

function DetailRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  content: { gap: 16, padding: 16, paddingBottom: 32 },
  checkbox: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 5,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: colors.action,
    borderColor: colors.action,
  },
  checkmark: { color: colors.actionText, fontWeight: "700" },
  consentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    minHeight: 48,
  },
  contactActions: { alignItems: "center", flexDirection: "row", gap: 4 },
  confirmationActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  contactLoading: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  confirmation: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.surface,
    gap: 4,
    padding: 12,
  },
  confirmationAction: {
    flex: 1,
  },
  customerName: {
    ...typography.heading,
    color: colors.primaryText,
    flexShrink: 1,
  },
  detailLabel: { ...typography.caption, color: colors.secondaryText },
  detailRow: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingVertical: 10,
  },
  detailValue: { ...typography.body, color: colors.primaryText },
  futureSeriesList: { gap: 8, marginTop: 12 },
  futureSeriesRow: {
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  details: { marginTop: 12 },
  error: { ...typography.caption, color: colors.danger, marginTop: 12 },
  header: { gap: 6 },
  iconAction: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  helper: { ...typography.body, color: colors.secondaryText },
  pressed: { opacity: 0.82 },
  paymentInput: {
    ...typography.body,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.primaryText,
    marginVertical: 12,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  noteInput: {
    ...typography.body,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: 1,
    color: colors.primaryText,
    marginBottom: 12,
    minHeight: 112,
    padding: 14,
  },
  sectionTitle: {
    ...typography.section,
    color: colors.primaryText,
    marginBottom: 12,
  },
  serviceName: {
    ...typography.body,
    color: colors.secondaryText,
    flexShrink: 1,
  },
  serviceStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
