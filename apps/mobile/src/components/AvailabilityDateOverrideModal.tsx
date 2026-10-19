import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate, formatTime } from "@schedule-app/i18n";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { MasterAppointment } from "../features/appointments/manualBooking";
import {
  type AvailabilityOverrideDraft,
  findAvailabilityConflicts,
  isValidAvailabilityOverrideDraft,
} from "../features/availability/dateOverrides";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import { DateTimePickerField } from "./DateTimePickerField";
import { FullscreenModal } from "./FullscreenModal";

type AvailabilityDateOverrideModalProps = {
  readonly appointments: readonly MasterAppointment[];
  readonly canAddBreak: boolean;
  readonly date: string;
  readonly endLocalTime: string;
  readonly error: string | null;
  readonly hasOverride: boolean;
  readonly initialIsClosed: boolean;
  readonly isSaving: boolean;
  readonly locale: SupportedLocale;
  readonly onClear: () => Promise<void>;
  readonly onAddBreak: () => void;
  readonly onClose: () => void;
  readonly onSave: (draft: AvailabilityOverrideDraft) => Promise<void>;
  readonly startLocalTime: string;
  readonly t: (key: MessageKey) => string;
  readonly timezone: string;
  readonly visible: boolean;
};

export function AvailabilityDateOverrideModal({
  appointments,
  canAddBreak,
  date,
  endLocalTime,
  error,
  hasOverride,
  initialIsClosed,
  isSaving,
  locale,
  onClear,
  onAddBreak,
  onClose,
  onSave,
  startLocalTime,
  t,
  timezone,
  visible,
}: AvailabilityDateOverrideModalProps) {
  const [kind, setKind] = useState<"closed" | "modified">(
    initialIsClosed ? "closed" : "modified",
  );
  const [startTime, setStartTime] = useState(startLocalTime);
  const [endTime, setEndTime] = useState(endLocalTime);
  const dateLabel = formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
    timeZone: timezone,
  });
  const draft = useMemo<AvailabilityOverrideDraft>(
    () => ({
      date,
      endLocalTime: kind === "modified" ? endTime : null,
      kind,
      startLocalTime: kind === "modified" ? startTime : null,
    }),
    [date, endTime, kind, startTime],
  );
  const conflicts = findAvailabilityConflicts(appointments, {
    ...draft,
    timezone,
  });
  const isValidDraft = isValidAvailabilityOverrideDraft(draft);

  useEffect(() => {
    if (!visible) return;
    setKind(initialIsClosed ? "closed" : "modified");
    setStartTime(startLocalTime.slice(0, 5));
    setEndTime(endLocalTime.slice(0, 5));
  }, [endLocalTime, initialIsClosed, startLocalTime, visible]);

  async function save() {
    try {
      await onSave(draft);
    } catch {
      // The parent exposes the server error through the error prop.
    }
  }

  async function clear() {
    try {
      await onClear();
    } catch {
      // The parent exposes the server error through the error prop.
    }
  }

  return (
    <FullscreenModal
      closeDisabled={isSaving}
      closeIcon="chevron-left"
      closeLabel={t("common.back")}
      onClose={onClose}
      title={t("mobile.calendarDaySettings")}
      visible={visible}
      footer={
        <View style={styles.footer}>
          {!isValidDraft ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t("mobile.calendarDayInvalidHours")}
            </Text>
          ) : null}
          {conflicts.length ? (
            <Text accessibilityRole="alert" style={styles.warning}>
              {t("mobile.calendarDayConflictCount").replace(
                "{count}",
                String(conflicts.length),
              )}
            </Text>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t("mobile.calendarDaySaveFailed")}
            </Text>
          ) : null}
          <ActionButton
            disabled={isSaving || !isValidDraft}
            label={t("mobile.calendarDaySave")}
            loading={isSaving}
            onPress={() => void save()}
            variant="primary"
          />
          {hasOverride ? (
            <ActionButton
              disabled={isSaving}
              label={t("mobile.calendarDayReset")}
              onPress={() => void clear()}
              variant="secondary"
            />
          ) : null}
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.description}>
          {t("mobile.calendarDaySettingsDescription")}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.modeGroup}>
          <ModeButton
            active={kind === "modified"}
            label={t("mobile.calendarDayOpen")}
            onPress={() => setKind("modified")}
          />
          <ModeButton
            active={kind === "closed"}
            label={t("mobile.calendarDayClose")}
            onPress={() => setKind("closed")}
          />
        </View>
        {kind === "modified" ? (
          <>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <DateTimePickerField
                  label={t("mobile.calendarDayStart")}
                  locale={locale}
                  mode="time"
                  onChange={setStartTime}
                  placeholder={t("mobile.personalBlockTimePlaceholder")}
                  t={t}
                  value={startTime}
                />
              </View>
              <View style={styles.timeField}>
                <DateTimePickerField
                  label={t("mobile.calendarDayEnd")}
                  locale={locale}
                  mode="time"
                  onChange={setEndTime}
                  placeholder={t("mobile.personalBlockTimePlaceholder")}
                  t={t}
                  value={endTime}
                />
              </View>
            </View>
            {canAddBreak ? (
              <ActionButton
                label={t("mobile.personalBlockAdd")}
                onPress={onAddBreak}
                variant="secondary"
              />
            ) : null}
          </>
        ) : null}
        {conflicts.length ? (
          <View style={styles.conflictBox}>
            <Text style={styles.conflictTitle}>
              {t("mobile.calendarDayConflictDescription")}
            </Text>
            {conflicts.map((appointment) => (
              <Text key={appointment.id} style={styles.conflictItem}>
                {appointment.customer_name} ·{" "}
                {formatTime(new Date(appointment.starts_at), locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: timezone,
                })}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </FullscreenModal>
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
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive]}
    >
      <Text style={[styles.modeText, active && styles.modeTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, padding: 20 },
  date: { ...typography.section, color: colors.primaryText },
  description: { ...typography.body, color: colors.secondaryText },
  modeGroup: { flexDirection: "row", gap: 12 },
  modeButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  modeButtonActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  modeText: { ...typography.label, color: colors.primaryText },
  modeTextActive: { color: colors.accent },
  timeRow: { flexDirection: "row", gap: 12 },
  timeField: { flex: 1 },
  conflictBox: {
    backgroundColor: colors.pendingSoft,
    borderColor: colors.pendingText,
    borderRadius: radii.surface,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  conflictTitle: { ...typography.body, color: colors.pendingText },
  conflictItem: { ...typography.label, color: colors.primaryText },
  footer: { gap: 12 },
  warning: { ...typography.label, color: colors.pendingText },
  error: { ...typography.label, color: colors.danger },
});
