import type { MessageKey } from "@schedule-app/i18n";
import { formatTime, type SupportedLocale } from "@schedule-app/i18n";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "../../components/AppointmentStatusBadge";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import type { PersonalBlock } from "../../features/availability/personalBlocks";
import {
  type DayTimeline as DayTimelineData,
  type DayTimelineEvent,
  timelineSlotHeight,
  timelineSlotMinutes,
} from "../../features/calendar/dayTimeline";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { CalendarEventLegend } from "./CalendarEventLegend";

type DayTimelineProps = {
  readonly onPressAppointment?: (appointment: MasterAppointment) => void;
  readonly onPressBlock?: (block: PersonalBlock) => void;
  readonly onPressEmptySlot?: (minute: number) => void;
  readonly locale: SupportedLocale;
  readonly selectedDate: string;
  readonly t: (key: MessageKey) => string;
  readonly timeline: DayTimelineData;
  readonly timezone: string;
};

export function DayTimeline({
  onPressAppointment,
  onPressBlock,
  onPressEmptySlot,
  locale,
  selectedDate,
  t,
  timeline,
  timezone,
}: DayTimelineProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(intervalId);
  }, []);

  const zonedNow = getZonedTime(now, timezone);
  const showCurrentTime =
    zonedNow.date === selectedDate &&
    zonedNow.minute >= timeline.startMinute &&
    zonedNow.minute < timeline.endMinute;
  const currentTimeTop =
    ((zonedNow.minute - timeline.startMinute) / timelineSlotMinutes) *
      timelineSlotHeight -
    9;
  const currentTimeLabel = formatTime(now, locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  if (timeline.isClosed) {
    return (
      <View style={styles.closedState}>
        <Text style={styles.closedTitle}>{t("mobile.calendarClosed")}</Text>
        <Text style={styles.helper}>
          {t("mobile.calendarClosedDescription")}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View accessibilityRole="list" style={styles.timeline}>
        {timeline.slots.map((slot) => (
          <Pressable
            accessibilityHint={t("mobile.calendarTapToBook")}
            accessibilityLabel={`${slot.label}, ${t("mobile.calendarTapToBook")}`}
            accessibilityRole="button"
            key={slot.minute}
            onPress={() => onPressEmptySlot?.(slot.minute)}
            style={({ pressed }) => [
              styles.gridRow,
              pressed && onPressEmptySlot && styles.gridRowPressed,
            ]}
          >
            <View style={styles.timeColumn}>
              <Text style={styles.timeLabel}>{slot.label}</Text>
            </View>
            <View style={styles.gridCell} />
          </Pressable>
        ))}
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {timeline.events.map((event) => (
            <TimelineEvent
              event={event}
              key={event.id}
              onPressAppointment={onPressAppointment}
              onPressBlock={onPressBlock}
              t={t}
              timeline={timeline}
            />
          ))}
          {showCurrentTime ? (
            <View
              accessible
              accessibilityLabel={`${t("mobile.calendarCurrentTime")}: ${currentTimeLabel}`}
              pointerEvents="none"
              style={[styles.currentTimeIndicator, { top: currentTimeTop }]}
            >
              <Text style={styles.currentTimeLabel}>{currentTimeLabel}</Text>
              <View style={styles.currentTimeDot} />
              <View style={styles.currentTimeRule} />
            </View>
          ) : null}
        </View>
      </View>
      <CalendarEventLegend t={t} />
    </View>
  );
}

function getZonedTime(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minute: Number(values.hour) * 60 + Number(values.minute),
  };
}

function TimelineEvent({
  event,
  onPressAppointment,
  onPressBlock,
  t,
  timeline,
}: {
  readonly event: DayTimelineEvent;
  readonly onPressAppointment?: (appointment: MasterAppointment) => void;
  readonly onPressBlock?: (block: PersonalBlock) => void;
  readonly t: DayTimelineProps["t"];
  readonly timeline: DayTimelineData;
}) {
  const height = Math.max(
    ((event.endMinute - event.startMinute) / timelineSlotMinutes) *
      timelineSlotHeight -
      6,
    38,
  );
  const top =
    ((event.startMinute - timeline.startMinute) / timelineSlotMinutes) *
      timelineSlotHeight +
    3;
  const appointment = event.appointment;
  const appointmentSource = appointment
    ? t(
        appointment.source === "public_booking"
          ? "mobile.calendarOnlineBooking"
          : "mobile.calendarManualBooking",
      )
    : "";
  const content = (
    <>
      <View style={styles.eventHeader}>
        <Text
          numberOfLines={1}
          style={[
            styles.eventTitle,
            event.kind === "block" && styles.blockEventText,
          ]}
        >
          {event.title}
        </Text>
        {appointment ? (
          <AppointmentStatusBadge
            label={getAppointmentStatusLabel(appointment.status, t)}
            status={appointment.status}
          />
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.eventSubtitle,
          event.kind === "block" && styles.blockEventText,
        ]}
      >
        {event.subtitle || t("mobile.personalBlocks")}
      </Text>
    </>
  );

  if (event.kind === "block") {
    if (event.block && onPressBlock) {
      return (
        <Pressable
          accessibilityLabel={`${event.title}, ${t("mobile.personalBlockEditTitle")}`}
          accessibilityRole="button"
          onPress={() => onPressBlock(event.block as PersonalBlock)}
          style={({ pressed }) => [
            styles.event,
            styles.blockEvent,
            { height, top },
            pressed && styles.eventPressed,
          ]}
        >
          {content}
        </Pressable>
      );
    }

    return (
      <View
        accessibilityLabel={`${event.title}, ${t("mobile.calendarBreak")}`}
        style={[styles.event, styles.blockEvent, { height, top }]}
      >
        {content}
      </View>
    );
  }

  if (!appointment || !onPressAppointment) {
    return (
      <View style={[styles.event, styles.appointmentEvent, { height, top }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`${appointment.customer_name}, ${appointmentSource}, ${getAppointmentStatusLabel(appointment.status, t)}`}
      accessibilityRole="button"
      onPress={() => onPressAppointment(appointment)}
      style={({ pressed }) => [
        styles.event,
        styles.appointmentEvent,
        appointment.source === "public_booking" &&
          styles.onlineAppointmentEvent,
        { height, top },
        pressed && styles.eventPressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  appointmentEvent: {
    backgroundColor: colors.accentSoft,
    borderLeftColor: colors.accent,
  },
  onlineAppointmentEvent: {
    backgroundColor: colors.scheduleOnlineSoft,
    borderLeftColor: colors.scheduleOnline,
  },
  blockEvent: {
    backgroundColor: colors.dangerSoft,
    borderLeftColor: colors.danger,
  },
  blockEventText: { color: colors.danger },
  closedState: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    gap: 4,
    padding: 16,
  },
  closedTitle: { ...typography.label, color: colors.primaryText },
  currentTimeDot: {
    backgroundColor: colors.danger,
    borderRadius: 4,
    height: 8,
    left: 54,
    position: "absolute",
    top: 5,
    width: 8,
  },
  currentTimeIndicator: {
    height: 20,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 2,
  },
  currentTimeLabel: {
    ...typography.caption,
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
    color: colors.inverse,
    fontWeight: "700",
    left: 0,
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 2,
    position: "absolute",
    top: 0,
  },
  currentTimeRule: {
    backgroundColor: colors.danger,
    height: 2,
    left: 58,
    position: "absolute",
    right: 0,
    top: 8,
  },
  event: {
    borderLeftWidth: 4,
    left: 58,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    right: 0,
  },
  eventHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  eventPressed: { opacity: 0.78 },
  eventSubtitle: { ...typography.caption, color: colors.secondaryText },
  eventTitle: {
    ...typography.label,
    color: colors.primaryText,
    flex: 1,
    fontWeight: "700",
  },
  gridCell: {
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.borderSubtle,
    borderLeftWidth: StyleSheet.hairlineWidth,
    flex: 1,
  },
  gridRow: { flexDirection: "row", height: timelineSlotHeight },
  gridRowPressed: { backgroundColor: colors.accentSoft },
  helper: { ...typography.body, color: colors.secondaryText },
  timeColumn: { alignItems: "flex-start", width: 58 },
  timeLabel: { ...typography.caption, color: colors.secondaryText },
  timeline: { overflow: "hidden" },
});
