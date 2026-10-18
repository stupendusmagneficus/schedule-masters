import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {
  getIntlLocale,
  type MessageKey,
  type SupportedLocale,
} from "@schedule-app/i18n";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import {
  getCalendarDays,
  getWeekdayLabels,
  isSameCalendarDay,
  moveCalendarMonth,
} from "../utils/calendarDateGrid";
import {
  formatDateFieldValue,
  serializeDateFieldValue,
} from "../utils/dateFieldValue";
import { AnimatedBottomSheet } from "./AnimatedBottomSheet";

type CalendarDatePickerSheetProps = {
  readonly initialDate: Date;
  readonly locale: SupportedLocale;
  readonly onCancel: () => void;
  readonly onConfirm: (date: Date) => void;
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
};

export function CalendarDatePickerSheet({
  initialDate,
  locale,
  onCancel,
  onConfirm,
  t,
  visible,
}: CalendarDatePickerSheetProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(initialDate);

  useEffect(() => {
    if (visible) {
      setSelectedDate(initialDate);
      setVisibleMonth(initialDate);
    }
  }, [initialDate, visible]);

  const weekdays = getWeekdayLabels(locale);
  const days = getCalendarDays(visibleMonth, locale);

  return (
    <AnimatedBottomSheet
      onClose={onCancel}
      showHandle={false}
      sheetStyle={styles.sheet}
      visible={visible}
    >
      <View style={styles.sheetHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.headerAction}
        >
          <Text style={styles.cancelText}>{t("common.cancel")}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.sheetTitle}>
          {t("mobile.datePickerChoose")}
        </Text>
        <Pressable
          accessibilityLabel={t("mobile.datePickerToday")}
          accessibilityRole="button"
          onPress={() => onConfirm(selectedDate)}
          style={[styles.headerAction, styles.doneAction]}
        >
          <Text style={styles.doneText}>{t("common.done")}</Text>
        </Pressable>
      </View>
      <View style={styles.monthHeader}>
        <Pressable
          accessibilityLabel={t("mobile.datePickerPreviousMonth")}
          accessibilityRole="button"
          onPress={() =>
            setVisibleMonth((month) => moveCalendarMonth(month, -1))
          }
          style={styles.monthArrow}
        >
          <MaterialCommunityIcons
            color={colors.primaryText}
            name="chevron-left"
            size={24}
          />
        </Pressable>
        <Text style={styles.monthTitle}>
          {new Intl.DateTimeFormat(getIntlLocale(locale), {
            month: "long",
            year: "numeric",
          }).format(visibleMonth)}
        </Text>
        <Pressable
          accessibilityLabel={t("mobile.datePickerNextMonth")}
          accessibilityRole="button"
          onPress={() =>
            setVisibleMonth((month) => moveCalendarMonth(month, 1))
          }
          style={styles.monthArrow}
        >
          <MaterialCommunityIcons
            color={colors.primaryText}
            name="chevron-right"
            size={24}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const today = new Date();
            setSelectedDate(today);
            setVisibleMonth(today);
          }}
          style={styles.todayAction}
        >
          <Text style={styles.todayText}>{t("mobile.datePickerToday")}</Text>
        </Pressable>
      </View>
      <View style={styles.calendarGrid}>
        {weekdays.map((weekday) => (
          <Text key={weekday} style={styles.weekday}>
            {weekday}
          </Text>
        ))}
        {days.map((date) => {
          if (date.getMonth() !== visibleMonth.getMonth()) {
            return (
              <View
                key={serializeDateFieldValue(date)}
                style={styles.calendarDay}
              />
            );
          }
          const isSelected = isSameCalendarDay(date, selectedDate);
          return (
            <Pressable
              accessibilityLabel={formatDateFieldValue(
                serializeDateFieldValue(date),
                locale,
              )}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={serializeDateFieldValue(date)}
              onPress={() => setSelectedDate(date)}
              style={[styles.calendarDay, isSelected && styles.selectedDay]}
            >
              <Text
                style={[styles.dayText, isSelected && styles.selectedDayText]}
              >
                {date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </AnimatedBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 8,
  },
  sheetHeader: {
    alignItems: "center",
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: 16,
  },
  headerAction: { justifyContent: "center", minHeight: 44, width: 76 },
  doneAction: { alignItems: "flex-end" },
  sheetTitle: {
    ...typography.label,
    color: colors.primaryText,
    flex: 1,
    fontWeight: "700",
    textAlign: "center",
  },
  cancelText: { ...typography.label, color: colors.secondaryText },
  doneText: { ...typography.label, color: colors.accent, fontWeight: "700" },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  monthArrow: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  monthTitle: {
    ...typography.label,
    color: colors.primaryText,
    flex: 1,
    textAlign: "center",
    textTransform: "capitalize",
  },
  todayAction: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  todayText: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  weekday: {
    ...typography.caption,
    color: colors.secondaryText,
    height: 40,
    lineHeight: 40,
    textAlign: "center",
    width: "14.2857%",
  },
  calendarDay: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: "14.2857%",
  },
  selectedDay: { backgroundColor: colors.accent, borderRadius: radii.pill },
  dayText: { ...typography.body, color: colors.primaryText },
  selectedDayText: { color: colors.actionText, fontWeight: "700" },
});
