import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate } from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getAppointmentStatusLabel } from "../../components/AppointmentStatusBadge";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import { formatTimelineTime } from "../../features/calendar/dayTimeline";
import {
  buildWeekCalendarMonth,
  type WeekCalendarDay,
  type WeekCalendarEvent,
} from "../../features/calendar/weekCalendar";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";

const compactSlotHeight = 24;
const calendarTimeGutterWidth = 36;

type WeekCalendarProps = {
  readonly days: readonly WeekCalendarDay[];
  readonly locale: SupportedLocale;
  readonly onPressAppointment?: (appointment: MasterAppointment) => void;
  readonly onPressDay?: (date: string) => void;
  readonly onPressTime?: (date: string, minute: number) => void;
  readonly selectedDate: string;
  readonly t: (key: MessageKey) => string;
  readonly timezone: string;
};

export function WeekCalendar({
  days,
  locale,
  onPressAppointment,
  onPressDay,
  onPressTime,
  selectedDate,
  t,
  timezone,
}: WeekCalendarProps) {
  const monthDays = buildWeekCalendarMonth(selectedDate, days);
  const openDays = days.filter((day) => !day.isClosed);
  const startMinute = Math.min(
    ...(openDays.length ? openDays : days).map((day) => day.startMinute),
  );
  const endMinute = Math.max(
    ...(openDays.length ? openDays : days).map((day) => day.endMinute),
  );
  const timeSlots = createCompactSlots(startMinute, endMinute);
  const monthLabel = formatDate(
    new Date(`${selectedDate.slice(0, 7)}-15T12:00:00.000Z`),
    locale,
    { month: "long", timeZone: "UTC", year: "numeric" },
  );
  const totalEvents = days.reduce((total, day) => total + day.events.length, 0);

  return (
    <View
      accessibilityLabel={t("mobile.calendarWeekView")}
      accessibilityRole="summary"
      style={styles.root}
    >
      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <Text style={styles.monthSummary}>
          {totalEvents
            ? `${totalEvents} ${t("mobile.weekBookings")}`
            : t("mobile.weekNoBookings")}
        </Text>
      </View>
      <View style={styles.monthWeekdays}>
        {monthDays.slice(0, 7).map((day) => (
          <Text key={day.date} style={styles.monthWeekday}>
            {formatWeekday(day.date, locale)}
          </Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {monthDays.map((day) => (
          <Pressable
            accessibilityLabel={formatDateLabel(day.date, locale)}
            accessibilityRole="button"
            key={day.date}
            onPress={() => onPressDay?.(day.date)}
            style={({ pressed }) => [
              styles.monthDay,
              !day.isCurrentMonth && styles.monthDayOutside,
              day.isSelectedWeek && styles.monthDaySelectedWeek,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.monthDayText,
                !day.isCurrentMonth && styles.monthDayTextOutside,
                day.date === selectedDate && styles.monthDayTextSelected,
              ]}
            >
              {day.dayOfMonth}
            </Text>
            {day.hasEvents ? <View style={styles.monthDayDot} /> : null}
          </Pressable>
        ))}
      </View>

      <View style={styles.weekHeaderRow}>
        <View style={styles.timeHeader} />
        <View style={styles.dayHeaderColumns}>
          {days.map((day) => (
            <Pressable
              accessibilityLabel={formatDateLabel(day.date, locale)}
              accessibilityRole="button"
              key={day.date}
              onPress={() => onPressDay?.(day.date)}
              style={({ pressed }) => [
                styles.weekDayHeader,
                day.date === selectedDate && styles.weekDayHeaderSelected,
                day.isClosed && styles.weekDayHeaderClosed,
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.weekDayName,
                  day.date === selectedDate && styles.weekDayTextSelected,
                ]}
              >
                {formatWeekday(day.date, locale)}
              </Text>
              <Text
                style={[
                  styles.weekDayNumber,
                  day.date === selectedDate && styles.weekDayTextSelected,
                ]}
              >
                {day.date.slice(-2).replace(/^0/, "")}
              </Text>
              <View
                style={[
                  styles.weekDayDot,
                  day.events.length > 0 && styles.weekDayDotActive,
                  day.isClosed && styles.weekDayDotClosed,
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.schedule}>
        <View style={styles.timeGutter}>
          {timeSlots.map((minute) => (
            <View key={minute} style={styles.timeRow}>
              <Text style={styles.timeLabel}>
                {minute % 60 === 0 ? formatTimelineTime(minute) : ""}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.scheduleColumns}>
          {days.map((day) => (
            <View
              accessibilityLabel={
                day.isClosed
                  ? `${formatDateLabel(day.date, locale)}, ${t("mobile.calendarClosed")}`
                  : formatDateLabel(day.date, locale)
              }
              key={day.date}
              style={[
                styles.scheduleColumn,
                day.isClosed && styles.closedColumn,
              ]}
            >
              {timeSlots.map((minute) => (
                <Pressable
                  accessibilityHint={t("mobile.calendarTapToBook")}
                  accessibilityLabel={`${formatTimelineTime(minute)}, ${formatDateLabel(day.date, locale)}`}
                  accessibilityRole="button"
                  disabled={day.isClosed || !onPressTime}
                  key={minute}
                  onPress={() => onPressTime?.(day.date, minute)}
                  style={({ pressed }) => [
                    styles.gridSlot,
                    pressed && onPressTime && styles.gridSlotPressed,
                  ]}
                />
              ))}
              {day.events.map((event) => (
                <WeekCalendarEventCard
                  event={event}
                  gridStartMinute={startMinute}
                  key={event.id}
                  locale={locale}
                  onPressAppointment={onPressAppointment}
                  t={t}
                  timezone={timezone}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.hint}>{t("mobile.calendarTapToBook")}</Text>
    </View>
  );
}

function WeekCalendarEventCard({
  event,
  gridStartMinute,
  locale,
  onPressAppointment,
  t,
  timezone,
}: {
  readonly event: WeekCalendarEvent;
  readonly gridStartMinute: number;
  readonly locale: SupportedLocale;
  readonly onPressAppointment?: (appointment: MasterAppointment) => void;
  readonly t: WeekCalendarProps["t"];
  readonly timezone: string;
}) {
  const startMinute = getLocalMinutes(event.startAt, timezone);
  const endMinute = Math.max(
    startMinute + 30,
    getLocalMinutes(event.endAt, timezone),
  );
  const top = Math.max(
    ((startMinute - gridStartMinute) / 30) * compactSlotHeight,
    0,
  );
  const height = Math.max(
    ((endMinute - startMinute) / 30) * compactSlotHeight - 2,
    22,
  );
  const statusColor =
    event.status === "pending" ? colors.pendingText : colors.accent;
  const accessibilityLabel =
    event.appointment && event.status
      ? `${event.title}, ${event.subtitle}, ${getAppointmentStatusLabel(event.status, t)}`
      : `${event.title}, ${event.subtitle || t("mobile.personalBlocks")}`;
  const content = (
    <>
      <View style={styles.eventTopLine}>
        <Text numberOfLines={1} style={styles.eventTime}>
          {formatTime(event.startAt, locale, timezone)}
        </Text>
        <View
          style={[styles.eventStatusDot, { backgroundColor: statusColor }]}
        />
      </View>
      <Text numberOfLines={1} style={styles.eventTitle}>
        {event.title}
      </Text>
      {height >= 48 ? (
        <Text numberOfLines={1} style={styles.eventSubtitle}>
          {event.subtitle || t("mobile.personalBlocks")}
        </Text>
      ) : null}
    </>
  );

  if (!event.appointment || !onPressAppointment) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        style={[styles.event, styles.blockEvent, { height, top }]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={() => onPressAppointment(event.appointment as MasterAppointment)}
      style={({ pressed }) => [
        styles.event,
        styles.appointmentEvent,
        { height, top },
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

function createCompactSlots(startMinute: number, endMinute: number): number[] {
  const firstSlot = Math.floor(startMinute / 30) * 30;
  const lastSlot = Math.ceil(endMinute / 30) * 30;
  return Array.from(
    { length: Math.max((lastSlot - firstSlot) / 30, 1) },
    (_, index) => firstSlot + index * 30,
  );
}

function formatDateLabel(date: string, locale: SupportedLocale): string {
  return formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short",
  });
}

function formatTime(
  value: string,
  locale: SupportedLocale,
  timezone: string,
): string {
  return formatDate(new Date(value), locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

function formatWeekday(date: string, locale: SupportedLocale): string {
  return formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
    timeZone: "UTC",
    weekday: "short",
  }).replace(".", "");
}

function getLocalMinutes(value: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: timezone,
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return values.hour * 60 + values.minute;
}

const styles = StyleSheet.create({
  appointmentEvent: {
    backgroundColor: colors.accentSoft,
    borderLeftColor: colors.accent,
  },
  blockEvent: {
    backgroundColor: colors.subtleSurface,
    borderLeftColor: colors.secondaryText,
  },
  closedColumn: { backgroundColor: colors.canvas },
  dayHeaderColumns: { flex: 1, flexDirection: "row", minWidth: 0 },
  event: {
    borderLeftWidth: 2,
    borderRadius: 4,
    left: 1,
    overflow: "hidden",
    paddingHorizontal: 3,
    paddingVertical: 2,
    position: "absolute",
    right: 1,
  },
  eventStatusDot: { borderRadius: 999, height: 4, width: 4 },
  eventSubtitle: { color: colors.secondaryText, fontSize: 8, lineHeight: 10 },
  eventTime: { color: colors.secondaryText, fontSize: 8, lineHeight: 9 },
  eventTitle: {
    color: colors.primaryText,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 11,
  },
  eventTopLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridSlot: {
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.borderSubtle,
    borderLeftWidth: StyleSheet.hairlineWidth,
    height: compactSlotHeight,
  },
  gridSlotPressed: { backgroundColor: colors.accentSoft },
  hint: {
    color: colors.secondaryText,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
    textAlign: "center",
  },
  monthDay: {
    alignItems: "center",
    borderRadius: radii.control,
    height: 25,
    justifyContent: "center",
    position: "relative",
    width: "14.2857%",
  },
  monthDayDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    bottom: 2,
    height: 3,
    position: "absolute",
    width: 3,
  },
  monthDayOutside: { opacity: 0.4 },
  monthDaySelectedWeek: { backgroundColor: colors.accentSoft },
  monthDayText: { color: colors.primaryText, fontSize: 11, lineHeight: 15 },
  monthDayTextOutside: { color: colors.secondaryText },
  monthDayTextSelected: {
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    color: colors.actionText,
    minWidth: 22,
    paddingHorizontal: 5,
    paddingVertical: 2,
    textAlign: "center",
  },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  monthHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  monthSummary: { ...typography.caption, color: colors.secondaryText },
  monthTitle: {
    ...typography.section,
    color: colors.primaryText,
    fontSize: 18,
  },
  monthWeekday: {
    color: colors.secondaryText,
    fontSize: 9,
    lineHeight: 12,
    textAlign: "center",
    width: "14.2857%",
  },
  monthWeekdays: { flexDirection: "row", marginBottom: 2 },
  pressed: { opacity: 0.72 },
  root: { minWidth: 0 },
  schedule: { flexDirection: "row", minWidth: 0 },
  scheduleColumn: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    position: "relative",
  },
  scheduleColumns: { flex: 1, flexDirection: "row", minWidth: 0 },
  timeGutter: { width: calendarTimeGutterWidth },
  timeHeader: { width: calendarTimeGutterWidth },
  timeLabel: {
    color: colors.secondaryText,
    fontSize: 8,
    lineHeight: 10,
    textAlign: "right",
  },
  timeRow: {
    alignItems: "flex-end",
    height: compactSlotHeight,
    justifyContent: "flex-start",
    paddingRight: 4,
    paddingTop: 2,
  },
  weekDayDot: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 3,
    marginTop: 2,
    width: 3,
  },
  weekDayDotActive: { backgroundColor: colors.accent },
  weekDayDotClosed: { backgroundColor: colors.secondaryText },
  weekDayHeader: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flex: 1,
    minWidth: 0,
    paddingBottom: 4,
    paddingHorizontal: 1,
    paddingTop: 3,
  },
  weekDayHeaderClosed: { backgroundColor: colors.subtleSurface },
  weekDayHeaderSelected: {
    backgroundColor: colors.accentSoft,
    borderRadius: 6,
  },
  weekDayName: {
    color: colors.secondaryText,
    fontSize: 8,
    lineHeight: 10,
    textAlign: "center",
  },
  weekDayNumber: {
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 15,
  },
  weekDayTextSelected: { color: colors.accentPressed },
  weekHeaderRow: { flexDirection: "row", marginBottom: 2 },
});
