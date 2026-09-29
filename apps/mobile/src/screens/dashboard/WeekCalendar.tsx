import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate, formatTime } from "@schedule-app/i18n";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "../../components/AppointmentStatusBadge";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import type {
  WeekCalendarDay,
  WeekCalendarEvent,
} from "../../features/calendar/weekCalendar";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";

type WeekCalendarProps = {
  readonly days: readonly WeekCalendarDay[];
  readonly locale: SupportedLocale;
  readonly onPressAppointment?: (appointment: MasterAppointment) => void;
  readonly onPressDay?: (date: string) => void;
  readonly selectedDate: string;
  readonly t: (key: MessageKey) => string;
  readonly timezone: string;
};

export function WeekCalendar({
  days,
  locale,
  onPressAppointment,
  onPressDay,
  selectedDate,
  t,
  timezone,
}: WeekCalendarProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {days.map((day) => (
        <View key={day.date} style={styles.dayColumn}>
          <Pressable
            accessibilityLabel={formatDateLabel(day.date, locale)}
            accessibilityRole="button"
            onPress={() => onPressDay?.(day.date)}
            style={({ pressed }) => [
              styles.dayHeader,
              day.date === selectedDate && styles.selectedDayHeader,
              pressed && styles.dayHeaderPressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.dayLabel,
                day.date === selectedDate && styles.selectedDayText,
              ]}
            >
              {formatDateLabel(day.date, locale)}
            </Text>
            <Text
              style={[
                styles.dayMeta,
                day.date === selectedDate && styles.selectedDayText,
              ]}
            >
              {day.isClosed
                ? t("mobile.calendarClosed")
                : `${day.events.length} ${t("mobile.weekBookings")}`}
            </Text>
          </Pressable>
          <View style={styles.dayBody}>
            {day.isClosed ? (
              <Text style={styles.closedText}>
                {t("mobile.calendarClosed")}
              </Text>
            ) : day.events.length ? (
              day.events.map((event) => (
                <WeekCalendarEventCard
                  event={event}
                  key={event.id}
                  locale={locale}
                  onPressAppointment={onPressAppointment}
                  t={t}
                  timezone={timezone}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>{t("mobile.weekNoBookings")}</Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function WeekCalendarEventCard({
  event,
  locale,
  onPressAppointment,
  t,
  timezone,
}: {
  readonly event: WeekCalendarEvent;
  readonly locale: SupportedLocale;
  readonly onPressAppointment?: (appointment: MasterAppointment) => void;
  readonly t: WeekCalendarProps["t"];
  readonly timezone: string;
}) {
  const content = (
    <>
      <Text numberOfLines={1} style={styles.eventTime}>
        {formatTime(new Date(event.startAt), locale, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: timezone,
        })}
      </Text>
      <Text numberOfLines={2} style={styles.eventTitle}>
        {event.title}
      </Text>
      <Text numberOfLines={2} style={styles.eventSubtitle}>
        {event.subtitle || t("mobile.personalBlocks")}
      </Text>
      {event.appointment && event.status ? (
        <AppointmentStatusBadge
          label={getAppointmentStatusLabel(event.status, t)}
          status={event.status}
        />
      ) : null}
    </>
  );

  if (!event.appointment || !onPressAppointment) {
    return (
      <View
        accessibilityLabel={event.title}
        style={[styles.event, styles.blockEvent]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={event.title}
      accessibilityRole="button"
      onPress={() => onPressAppointment(event.appointment as MasterAppointment)}
      style={({ pressed }) => [
        styles.event,
        styles.appointmentEvent,
        pressed && styles.eventPressed,
      ]}
    >
      {content}
    </Pressable>
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

const styles = StyleSheet.create({
  appointmentEvent: {
    backgroundColor: colors.accentSoft,
    borderLeftColor: colors.accent,
  },
  blockEvent: {
    backgroundColor: colors.subtleSurface,
    borderLeftColor: colors.secondaryText,
  },
  closedText: { ...typography.caption, color: colors.secondaryText },
  content: { gap: 8, paddingBottom: 4 },
  dayBody: { gap: 8, minHeight: 240 },
  dayColumn: { gap: 8, width: 132 },
  dayHeader: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    gap: 2,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dayHeaderPressed: { opacity: 0.78 },
  dayLabel: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
  },
  dayMeta: { ...typography.caption, color: colors.secondaryText },
  emptyText: { ...typography.caption, color: colors.secondaryText },
  event: {
    borderLeftWidth: 3,
    borderRadius: 0,
    gap: 2,
    minHeight: 92,
    padding: 8,
  },
  eventPressed: { opacity: 0.78 },
  eventSubtitle: { ...typography.caption, color: colors.secondaryText },
  eventTime: {
    ...typography.caption,
    color: colors.accentPressed,
    fontWeight: "700",
  },
  eventTitle: { ...typography.label, color: colors.primaryText },
  selectedDayHeader: { backgroundColor: colors.accent },
  selectedDayText: { color: colors.actionText },
});
