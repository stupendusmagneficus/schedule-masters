import type { MessageKey } from "@schedule-app/i18n";
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

type DayTimelineProps = {
  readonly onPressAppointment?: (appointment: MasterAppointment) => void;
  readonly onPressBlock?: (block: PersonalBlock) => void;
  readonly onPressEmptySlot?: (minute: number) => void;
  readonly t: (key: MessageKey) => string;
  readonly timeline: DayTimelineData;
};

export function DayTimeline({
  onPressAppointment,
  onPressBlock,
  onPressEmptySlot,
  t,
  timeline,
}: DayTimelineProps) {
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
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.appointmentDot]} />
          <Text style={styles.legendText}>{t("mobile.nextBooking")}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.blockDot]} />
          <Text style={styles.legendText}>{t("mobile.personalBlocks")}</Text>
        </View>
      </View>
    </View>
  );
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
        accessibilityLabel={`${event.title}, ${t("mobile.personalBlocks")}`}
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
      accessibilityLabel={`${appointment.customer_name}, ${getAppointmentStatusLabel(appointment.status, t)}`}
      accessibilityRole="button"
      onPress={() => onPressAppointment(appointment)}
      style={({ pressed }) => [
        styles.event,
        styles.appointmentEvent,
        { height, top },
        pressed && styles.eventPressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  appointmentDot: { backgroundColor: colors.accent },
  appointmentEvent: {
    backgroundColor: colors.accentSoft,
    borderLeftColor: colors.accent,
  },
  blockDot: { backgroundColor: colors.secondaryText },
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
  legend: { flexDirection: "row", gap: 16, marginTop: 12 },
  legendDot: { borderRadius: 999, height: 8, width: 8 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendText: { ...typography.caption, color: colors.secondaryText },
  timeColumn: { alignItems: "flex-start", width: 58 },
  timeLabel: { ...typography.caption, color: colors.secondaryText },
  timeline: { overflow: "hidden" },
});
