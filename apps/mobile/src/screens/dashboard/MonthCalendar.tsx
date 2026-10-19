import type { SupportedLocale } from "@schedule-app/i18n";
import { formatDate } from "@schedule-app/i18n";
import { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { getCalendarWorkloadLevel } from "../../features/calendar/calendarWorkload";
import type { MonthCalendarDay } from "../../features/calendar/monthCalendar";
import type { CalendarMonthEntry } from "../../features/calendar/useCalendarMonthWindow";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { CalendarWorkloadLegend } from "./CalendarWorkloadLegend";
import type { DashboardTabProps } from "./types";

const MONTH_ROW_HEIGHT = 348;

type MonthItem = CalendarMonthEntry & {
  readonly days: readonly MonthCalendarDay[];
};

type MonthCalendarProps = {
  readonly months: readonly MonthItem[];
  readonly isLoadingPrevious: boolean;
  readonly isLoadingNext: boolean;
  readonly loadPrevious: () => void;
  readonly loadNext: () => void;
  readonly locale: SupportedLocale;
  readonly selectionMode: boolean;
  readonly selectedDates: readonly string[];
  readonly openDateCount: number;
  readonly isBulkSaving: boolean;
  readonly selectionEnabled: boolean;
  readonly processedDates: readonly string[];
  readonly onSelectDate: (date: string) => void;
  readonly onToggleDate: (date: string) => void;
  readonly onStartSelection: () => void;
  readonly onCancelSelection: () => void;
  readonly onConfigureSelectedDates: () => void;
  readonly onCloseOpenDates: () => void;
  readonly onRepeatWeekly: () => void;
  readonly t: DashboardTabProps["t"];
};

export function MonthCalendar({
  months,
  isLoadingPrevious,
  isLoadingNext,
  loadPrevious,
  loadNext,
  locale,
  selectionMode,
  selectedDates,
  openDateCount,
  isBulkSaving,
  selectionEnabled,
  processedDates,
  onSelectDate,
  onToggleDate,
  onStartSelection,
  onCancelSelection,
  onConfigureSelectedDates,
  onCloseOpenDates,
  onRepeatWeekly,
  t,
}: MonthCalendarProps) {
  const listRef = useRef<FlatList<MonthItem>>(null);
  const scrollOffset = useRef(0);
  const firstMonth = useRef(months[0]?.month);
  useEffect(() => {
    const nextFirstMonth = months[0]?.month;
    const previousFirstMonth = firstMonth.current;
    if (
      nextFirstMonth &&
      previousFirstMonth &&
      nextFirstMonth !== previousFirstMonth
    ) {
      const addedAtStart = nextFirstMonth < previousFirstMonth;
      const offset = Math.max(
        0,
        scrollOffset.current + (addedAtStart ? 2 : -2) * MONTH_ROW_HEIGHT,
      );
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ animated: false, offset });
      });
      scrollOffset.current = offset;
    }
    firstMonth.current = nextFirstMonth;
  }, [months]);
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      scrollOffset.current = contentOffset.y;
      const distanceFromBottom =
        contentSize.height - contentOffset.y - layoutMeasurement.height;
      if (contentOffset.y < MONTH_ROW_HEIGHT * 0.55) loadPrevious();
      if (distanceFromBottom < MONTH_ROW_HEIGHT * 0.55) loadNext();
    },
    [loadNext, loadPrevious],
  );

  return (
    <View style={styles.root}>
      <View style={styles.monthToolbar}>
        <CalendarWorkloadLegend t={t} />
        {selectionMode ? (
          <Text style={styles.selectionHint}>
            {t("mobile.calendarSelectionHint")}
          </Text>
        ) : (
          <ActionButton
            disabled={!selectionEnabled}
            label={t("mobile.calendarSelectDays")}
            onPress={onStartSelection}
            size="compact"
            variant="secondary"
          />
        )}
      </View>
      <FlatList
        ref={listRef}
        data={months}
        getItemLayout={(_, index) => ({
          index,
          length: MONTH_ROW_HEIGHT,
          offset: MONTH_ROW_HEIGHT * index,
        })}
        initialNumToRender={5}
        initialScrollIndex={1}
        keyExtractor={(item) => item.month}
        maxToRenderPerBatch={3}
        onEndReached={loadNext}
        onEndReachedThreshold={0.6}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator
        style={styles.monthList}
        testID="calendar-month-list"
        windowSize={5}
        renderItem={({ item }) => (
          <MonthGrid
            days={item.days}
            hasData={Boolean(item.data)}
            hasError={item.hasError}
            locale={locale}
            onSelectDate={onSelectDate}
            onToggleDate={onToggleDate}
            selectionMode={selectionMode}
            selectedDates={selectedDates}
            t={t}
          />
        )}
      />
      {selectionMode ? (
        <View style={styles.selectionPanel}>
          <Text accessibilityLiveRegion="polite" style={styles.selectionCount}>
            {t("mobile.calendarSelectedDatesCount").replace(
              "{count}",
              String(selectedDates.length),
            )}
          </Text>
          {processedDates.length ? (
            <Text style={styles.processedDates}>
              {t("mobile.calendarBulkAppliedDates").replace(
                "{dates}",
                formatDates(processedDates, locale),
              )}
            </Text>
          ) : null}
          {selectedDates.length > 0 ? (
            <ActionButton
              disabled={isBulkSaving}
              label={t("mobile.calendarConfigureSelectedDates")}
              onPress={onConfigureSelectedDates}
              variant="primary"
            />
          ) : null}
          {openDateCount > 0 ? (
            <ActionButton
              disabled={isBulkSaving}
              label={t("mobile.calendarCloseOpenDays").replace(
                "{count}",
                String(openDateCount),
              )}
              onPress={onCloseOpenDates}
              variant="destructive"
            />
          ) : null}
          {selectedDates.length > 0 ? (
            <ActionButton
              disabled={isBulkSaving}
              label={t("mobile.calendarWeeklyAction")}
              onPress={onRepeatWeekly}
              variant="secondary"
            />
          ) : null}
          <ActionButton
            disabled={isBulkSaving}
            label={t("mobile.calendarCancelSelection")}
            onPress={onCancelSelection}
            variant="neutral"
          />
        </View>
      ) : null}
      {isLoadingPrevious ? <MonthLoading style={styles.loadingTop} /> : null}
      {isLoadingNext ? <MonthLoading style={styles.loadingBottom} /> : null}
    </View>
  );
}

function MonthGrid({
  days,
  hasData,
  hasError,
  locale,
  onSelectDate,
  onToggleDate,
  selectionMode,
  selectedDates,
  t,
}: {
  readonly days: readonly MonthCalendarDay[];
  readonly hasData: boolean;
  readonly hasError: boolean;
  readonly locale: SupportedLocale;
  readonly onSelectDate: (date: string) => void;
  readonly onToggleDate: (date: string) => void;
  readonly selectionMode: boolean;
  readonly selectedDates: readonly string[];
  readonly t: MonthCalendarProps["t"];
}) {
  const month = days.find((day) => day.isCurrentMonth)?.date ?? days[0]?.date;
  if (!month) return <View style={styles.monthRow} />;
  const monthLabel = formatDate(
    new Date(`${month.slice(0, 7)}-15T12:00:00.000Z`),
    locale,
    { month: "long", timeZone: "UTC", year: "numeric" },
  );
  const weekdays = days.slice(0, 7);

  return (
    <View style={styles.monthRow}>
      <View style={styles.monthHeading}>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        {hasError ? (
          <Text style={styles.error}>{t("common.error")}</Text>
        ) : null}
      </View>
      <View style={styles.weekdayRow}>
        {weekdays.map((day) => (
          <Text key={day.date} style={styles.weekday}>
            {formatDate(new Date(`${day.date}T12:00:00.000Z`), locale, {
              timeZone: "UTC",
              weekday: "short",
            }).replace(/\.$/, "")}
          </Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {days.map((day) => {
          const isMultiSelected = selectedDates.includes(day.date);
          const isDisabled = selectionMode && !hasData;
          const isStrongSelection =
            (day.isSelected && !selectionMode) ||
            (selectionMode && day.isToday && isMultiSelected);
          return (
            <Pressable
              accessibilityLabel={getDayAccessibilityLabel(day, locale, t)}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isDisabled,
                selected: selectionMode ? isMultiSelected : day.isSelected,
              }}
              disabled={isDisabled}
              key={day.date}
              onPress={() =>
                selectionMode ? onToggleDate(day.date) : onSelectDate(day.date)
              }
              testID={`calendar-month-day-${day.date}`}
              style={({ pressed }) => [
                styles.dayCell,
                !day.isCurrentMonth && styles.outsideDay,
                isDisabled && styles.disabledDay,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.dayCircle,
                  day.isClosed && styles.closedDay,
                  day.isToday && styles.todayDay,
                  selectionMode &&
                    isMultiSelected &&
                    (day.isToday
                      ? styles.selectedDay
                      : styles.multiSelectedDay),
                  isStrongSelection && styles.selectedDay,
                ]}
              >
                {day.bookingCount > 0 && day.workloadPercent !== null ? (
                  <View
                    accessibilityElementsHidden
                    style={[
                      getWorkloadRingStyle(
                        day.workloadPercent,
                        isStrongSelection
                          ? colors.actionText
                          : getWorkloadColor(day.workloadPercent),
                      ),
                    ]}
                  />
                ) : null}
                <Text
                  style={[
                    styles.dayNumber,
                    !day.isCurrentMonth && styles.outsideDayText,
                    isStrongSelection && styles.selectedDayText,
                  ]}
                >
                  {Number(day.date.slice(-2))}
                </Text>
                <View style={styles.indicators}>
                  {day.bookingCount > 0 ? (
                    <Text
                      style={[
                        styles.bookingCount,
                        {
                          color: isStrongSelection
                            ? colors.actionText
                            : day.workloadPercent === null
                              ? colors.secondaryText
                              : getWorkloadColor(day.workloadPercent),
                        },
                      ]}
                    >
                      {day.bookingCount}
                    </Text>
                  ) : null}
                  {day.blockCount > 0 ? (
                    <Text
                      style={[
                        styles.blockCount,
                        isStrongSelection && styles.selectedIndicator,
                      ]}
                    >
                      {day.blockCount}
                    </Text>
                  ) : null}
                  {day.isClosed ? (
                    <Text
                      style={[
                        styles.closedIndicator,
                        isStrongSelection && styles.selectedIndicator,
                      ]}
                    >
                      ×
                    </Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MonthLoading({ style }: { readonly style: object }) {
  return (
    <View style={[styles.loadingRow, style]}>
      <ActivityIndicator color={colors.accent} size="small" />
    </View>
  );
}

function getWorkloadColor(workloadPercent: number | null): string {
  switch (getCalendarWorkloadLevel(workloadPercent)) {
    case "high":
      return colors.danger;
    case "medium":
      return colors.pendingText;
    default:
      return colors.accent;
  }
}

function getWorkloadRingStyle(workloadPercent: number | null, color: string) {
  const percent = workloadPercent ?? 0;
  return [
    styles.workloadRing,
    {
      borderBottomColor: percent >= 50 ? color : "transparent",
      borderLeftColor: percent >= 75 ? color : "transparent",
      borderRightColor: percent >= 25 ? color : "transparent",
      borderTopColor: color,
    },
  ];
}

function getDayAccessibilityLabel(
  day: MonthCalendarDay,
  locale: SupportedLocale,
  t: MonthCalendarProps["t"],
) {
  const parts = [
    formatDate(new Date(`${day.date}T12:00:00.000Z`), locale, {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }),
    day.isToday ? t("mobile.today") : "",
    day.isClosed ? t("mobile.calendarClosed") : "",
    day.bookingCount
      ? `${day.bookingCount} ${t("mobile.monthBookings")}`
      : t("mobile.monthNoBookings"),
    day.blockCount ? `${day.blockCount} ${t("mobile.monthBlocks")}` : "",
    day.workloadPercent !== null
      ? `${day.workloadPercent}% ${t("mobile.calendarWorkload")}`
      : "",
  ];
  return parts.filter(Boolean).join(", ");
}

function formatDates(dates: readonly string[], locale: SupportedLocale) {
  return dates
    .map((date) =>
      formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      }),
    )
    .join(", ");
}

const styles = StyleSheet.create({
  blockCount: {
    backgroundColor: colors.subtleSurface,
    borderColor: colors.secondaryText,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.secondaryText,
    fontSize: 8,
    lineHeight: 11,
    minWidth: 12,
    overflow: "hidden",
    textAlign: "center",
  },
  bookingCount: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
    minWidth: 10,
    textAlign: "center",
  },
  closedDay: { backgroundColor: colors.subtleSurface },
  closedIndicator: {
    color: colors.secondaryText,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
  dayCell: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: "14.2857%",
  },
  dayCircle: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderRadius: radii.control,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    position: "relative",
    width: 42,
  },
  dayNumber: { color: colors.primaryText, fontSize: 12, lineHeight: 15 },
  error: { ...typography.caption, color: colors.danger },
  indicators: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    height: 12,
    justifyContent: "center",
  },
  loadingRow: { alignItems: "center", height: 28, justifyContent: "center" },
  loadingBottom: { bottom: 2, left: 0, position: "absolute", right: 0 },
  loadingTop: { left: 0, position: "absolute", right: 0, top: 2 },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -11,
  },
  monthHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    height: 32,
    marginBottom: 6,
  },
  monthList: { flex: 1 },
  monthToolbar: { gap: 12, paddingBottom: 12 },
  monthRow: { height: MONTH_ROW_HEIGHT, paddingBottom: 18 },
  monthTitle: {
    color: colors.primaryText,
    flex: 1,
    ...typography.label,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  outsideDay: { opacity: 0.42 },
  outsideDayText: { color: colors.secondaryText },
  disabledDay: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  root: { flex: 1, minHeight: 0 },
  selectionHint: { ...typography.caption, color: colors.secondaryText },
  selectionPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    paddingBottom: 8,
    paddingTop: 12,
  },
  selectionCount: { ...typography.label, color: colors.primaryText },
  processedDates: { ...typography.caption, color: colors.accent },
  multiSelectedDay: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 2,
  },
  selectedDay: { backgroundColor: colors.accent, borderColor: colors.accent },
  selectedDayText: { color: colors.actionText, fontWeight: "700" },
  selectedIndicator: {
    color: colors.actionText,
    borderColor: colors.actionText,
  },
  todayDay: { borderColor: colors.accent, borderWidth: 2 },
  weekday: {
    color: colors.secondaryText,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    width: "14.2857%",
  },
  weekdayRow: { flexDirection: "row", height: 20, marginBottom: 4 },
  workloadRing: {
    borderRadius: radii.control,
    borderWidth: 2,
    height: 38,
    left: 1,
    position: "absolute",
    top: 1,
    width: 38,
  },
});
