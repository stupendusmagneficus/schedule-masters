import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate } from "@schedule-app/i18n";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { WeeklyAvailabilityDraft } from "../features/availability/weeklySchedule";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import { DateTimePickerField } from "./DateTimePickerField";
import { FullscreenModal } from "./FullscreenModal";

type Props = {
  readonly dates: readonly string[];
  readonly error: string | null;
  readonly isSaving: boolean;
  readonly locale: SupportedLocale;
  readonly onApply: (
    drafts: readonly WeeklyAvailabilityDraft[],
  ) => Promise<void>;
  readonly onClose: () => void;
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
};

export function WeeklyAvailabilityModal({
  dates,
  error,
  isSaving,
  locale,
  onApply,
  onClose,
  t,
  visible,
}: Props) {
  const [isClosed, setClosed] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const weekdays = useMemo(() => {
    const byDay = new Map<number, string>();
    for (const date of dates) {
      const day = new Date(`${date}T00:00:00.000Z`).getUTCDay() || 7;
      byDay.set(day, date);
    }
    return [...byDay.entries()].sort(([left], [right]) => left - right);
  }, [dates]);
  const drafts = useMemo(
    () =>
      weekdays.map(([dayOfWeek]) => ({
        dayOfWeek,
        endLocalTime: isClosed ? null : endTime,
        kind: isClosed ? ("closed" as const) : ("modified" as const),
        startLocalTime: isClosed ? null : startTime,
      })),
    [endTime, isClosed, startTime, weekdays],
  );
  const validTimes = isClosed || endTime > startTime;

  useEffect(() => {
    if (visible) {
      setClosed(false);
      setStartTime("09:00");
      setEndTime("17:00");
    }
  }, [visible]);

  async function apply() {
    try {
      await onApply(drafts);
    } catch {
      /* Error is shown by the parent. */
    }
  }

  return (
    <FullscreenModal
      closeDisabled={isSaving}
      closeLabel={t("common.close")}
      onClose={onClose}
      title={t("mobile.calendarWeeklyTitle")}
      visible={visible}
      footer={
        <View style={styles.footer}>
          {!validTimes ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t("mobile.calendarBulkInvalidHours")}
            </Text>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t("mobile.calendarWeeklySaveFailed")}
            </Text>
          ) : null}
          <ActionButton
            disabled={isSaving || !dates.length || !validTimes}
            label={t("mobile.calendarWeeklyApply")}
            loading={isSaving}
            onPress={() => void apply()}
            variant={isClosed ? "destructive" : "primary"}
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
        <Text style={styles.description}>
          {t("mobile.calendarWeeklyDescription")}
        </Text>
        <View style={styles.weekdays}>
          {weekdays.map(([weekday, date]) => (
            <Text key={weekday} style={styles.weekday}>
              {formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
                weekday: "long",
                timeZone: "UTC",
              })}
            </Text>
          ))}
        </View>
        <View style={styles.options}>
          <ActionButton
            label={t("mobile.calendarWeeklyOpen")}
            onPress={() => setClosed(false)}
            variant={!isClosed ? "primary" : "neutral"}
          />
          <ActionButton
            label={t("mobile.calendarWeeklyClosed")}
            onPress={() => setClosed(true)}
            variant={isClosed ? "destructive" : "neutral"}
          />
        </View>
        {!isClosed ? (
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
      </ScrollView>
    </FullscreenModal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, padding: 20 },
  description: { ...typography.body, color: colors.secondaryText },
  weekdays: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  weekday: {
    ...typography.label,
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    color: colors.primaryText,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  options: { gap: 10 },
  timeFields: { gap: 16 },
  footer: { gap: 12 },
  error: { ...typography.label, color: colors.danger },
});
