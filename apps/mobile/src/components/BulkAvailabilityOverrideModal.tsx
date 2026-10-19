import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate } from "@schedule-app/i18n";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { MasterAppointment } from "../features/appointments/manualBooking";
import type { AvailabilityOverrideDraft } from "../features/availability/dateOverrides";
import {
  findAvailabilityConflicts,
  isValidAvailabilityOverrideDraft,
} from "../features/availability/dateOverrides";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import { DateTimePickerField } from "./DateTimePickerField";
import { FullscreenModal } from "./FullscreenModal";

export type AvailabilityConflictSummary = {
  readonly count: number;
  readonly date: string;
};

type BulkAvailabilityOverrideModalProps = {
  readonly appointmentsByDate: Readonly<
    Record<string, readonly MasterAppointment[]>
  >;
  readonly closedDateCount: number;
  readonly dates: readonly string[];
  readonly error: string | null;
  readonly isSaving: boolean;
  readonly locale: SupportedLocale;
  readonly mode: "close" | "configure";
  readonly openDateCount: number;
  readonly onApply: (drafts: AvailabilityOverrideDraft[]) => Promise<void>;
  readonly onClose: () => void;
  readonly timezone: string;
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
};

export function BulkAvailabilityOverrideModal({
  appointmentsByDate,
  closedDateCount,
  dates,
  error,
  isSaving,
  locale,
  mode,
  openDateCount,
  onApply,
  onClose,
  timezone,
  t,
  visible,
}: BulkAvailabilityOverrideModalProps) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const kind = mode === "configure" ? "modified" : "closed";
  const drafts = useMemo<AvailabilityOverrideDraft[]>(
    () =>
      dates.map((date) => ({
        date,
        endLocalTime: mode === "configure" ? endTime : null,
        kind,
        startLocalTime: mode === "configure" ? startTime : null,
      })),
    [dates, endTime, kind, mode, startTime],
  );
  const isValidDraft = drafts.every(isValidAvailabilityOverrideDraft);
  const conflicts = useMemo(
    () =>
      drafts.flatMap((draft) => {
        const count = findAvailabilityConflicts(
          appointmentsByDate[draft.date] ?? [],
          { ...draft, timezone },
        ).length;
        return count > 0 ? [{ count, date: draft.date }] : [];
      }),
    [appointmentsByDate, drafts, timezone],
  );
  const conflictCount = conflicts.reduce(
    (total, item) => total + item.count,
    0,
  );
  const formattedDates = dates
    .map((date) => formatBulkDate(date, locale))
    .join(", ");
  const isOpeningClosedDates =
    mode === "configure" && closedDateCount > 0 && openDateCount === 0;
  const titleKey =
    mode === "close"
      ? "mobile.calendarBulkCloseTitle"
      : isOpeningClosedDates
        ? "mobile.calendarOpenAndSetSelectedDatesTitle"
        : "mobile.calendarConfigureDatesTitle";
  const descriptionKey =
    mode === "close"
      ? "mobile.calendarBulkCloseDescription"
      : isOpeningClosedDates
        ? "mobile.calendarOpenAndSetSelectedDatesDescription"
        : closedDateCount > 0 && openDateCount > 0
          ? "mobile.calendarConfigureMixedDatesDescription"
          : "mobile.calendarConfigureDatesDescription";

  useEffect(() => {
    if (!visible) return;
    setStartTime("09:00");
    setEndTime("17:00");
  }, [visible]);

  async function apply() {
    try {
      await onApply(drafts);
    } catch {
      // The parent exposes the server error through the error prop.
    }
  }

  return (
    <FullscreenModal
      closeDisabled={isSaving}
      closeLabel={t("common.close")}
      onClose={onClose}
      title={`${t(titleKey)} (${dates.length})`}
      visible={visible}
      footer={
        <View style={styles.footer}>
          {!isValidDraft ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t("mobile.calendarBulkInvalidHours")}
            </Text>
          ) : null}
          {conflictCount > 0 ? (
            <Text style={styles.warning}>
              {t("mobile.calendarBulkConflictSummary")
                .replace("{dates}", formattedDates)
                .replace("{count}", String(conflictCount))}
            </Text>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t("mobile.calendarBulkSaveFailed")}
            </Text>
          ) : null}
          <ActionButton
            disabled={isSaving || !dates.length || !isValidDraft}
            label={t("mobile.calendarBulkApply")}
            loading={isSaving}
            onPress={() => void apply()}
            variant={mode === "configure" ? "primary" : "destructive"}
          />
          <ActionButton
            disabled={isSaving}
            label={t("common.cancel")}
            onPress={onClose}
            variant="neutral"
          />
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>{t(descriptionKey)}</Text>
        <Text style={styles.selectedCount}>
          {t("mobile.calendarSelectedDatesCount").replace(
            "{count}",
            String(dates.length),
          )}
        </Text>
        <View style={styles.dateList}>
          {dates.map((date) => (
            <Text key={date} style={styles.date}>
              {formatBulkDate(date, locale)}
            </Text>
          ))}
        </View>
        {mode === "configure" ? (
          <View style={styles.timeFields}>
            <DateTimePickerField
              label={t("mobile.calendarDayStart")}
              locale={locale}
              mode="time"
              onChange={setStartTime}
              placeholder={t("mobile.personalBlockTimePlaceholder")}
              t={t}
              value={startTime}
            />
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
        ) : null}
        {conflicts.length ? (
          <View style={styles.conflictBox}>
            <Text style={styles.conflictTitle}>
              {t("mobile.calendarDayConflictDescription")}
            </Text>
            {conflicts.map(({ count, date }) => (
              <Text key={date} style={styles.conflictDate}>
                {formatBulkDate(date, locale)}: {count}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </FullscreenModal>
  );
}

function formatBulkDate(date: string, locale: SupportedLocale) {
  return formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  content: { gap: 20, padding: 20 },
  description: { ...typography.body, color: colors.secondaryText },
  selectedCount: { ...typography.section, color: colors.primaryText },
  dateList: { gap: 8 },
  date: {
    ...typography.label,
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.surface,
    color: colors.primaryText,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timeFields: { gap: 16 },
  conflictBox: {
    backgroundColor: colors.pendingSoft,
    borderColor: colors.pendingText,
    borderRadius: radii.surface,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  conflictTitle: { ...typography.body, color: colors.pendingText },
  conflictDate: { ...typography.label, color: colors.primaryText },
  footer: { gap: 12 },
  warning: { ...typography.label, color: colors.pendingText },
  error: { ...typography.label, color: colors.danger },
});
