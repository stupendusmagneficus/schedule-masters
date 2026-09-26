import type { Database } from "@schedule-app/api";
import { formatDate, formatTime } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "../../components/AppointmentStatusBadge";
import { InfoCard } from "../../components/InfoCard";
import { PersonalBlockModal } from "../../components/PersonalBlockModal";
import type { DemoData } from "../../demo/types";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import type {
  PersonalBlock,
  PersonalBlockDraft,
} from "../../features/availability/personalBlocks";
import {
  type CalendarDataController,
  getCalendarDateLabel,
} from "../../features/calendar/useCalendarData";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type CalendarTabProps = DashboardTabProps & {
  readonly calendar: CalendarDataController;
  readonly client: SupabaseClient<Database> | null;
  readonly demoData?: DemoData;
  readonly onSelectAppointment?: (appointment: MasterAppointment) => void;
  readonly workspace: Workspace;
};

export function CalendarTab({
  calendar,
  client,
  demoData,
  locale,
  onSelectAppointment,
  t,
  workspace,
}: CalendarTabProps) {
  const [isBlockModalVisible, setBlockModalVisible] = useState(false);
  const dateLabel = getCalendarDateLabel(calendar.selectedDate, locale);

  return (
    <>
      <View style={styles.content}>
        <View>
          <Text style={styles.eyebrow}>{t("mobile.calendar")}</Text>
          <Text style={styles.title}>{dateLabel}</Text>
          <View style={styles.dateNavigation}>
            <Pressable
              accessibilityLabel={t("mobile.calendarPrevious")}
              accessibilityRole="button"
              disabled={!client}
              onPress={calendar.goToPrevious}
              style={({ pressed }) => [
                styles.navigationButton,
                !client && styles.disabled,
                pressed && styles.navigationButtonPressed,
              ]}
            >
              <Text style={styles.navigationButtonText}>‹</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!client}
              onPress={calendar.goToToday}
              style={({ pressed }) => [
                styles.todayButton,
                !client && styles.disabled,
                pressed && styles.navigationButtonPressed,
              ]}
            >
              <Text style={styles.todayButtonText}>{t("mobile.today")}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t("mobile.calendarNext")}
              accessibilityRole="button"
              disabled={!client}
              onPress={calendar.goToNext}
              style={({ pressed }) => [
                styles.navigationButton,
                !client && styles.disabled,
                pressed && styles.navigationButtonPressed,
              ]}
            >
              <Text style={styles.navigationButtonText}>›</Text>
            </Pressable>
          </View>
        </View>
        <InfoCard>
          <Text style={styles.sectionTitle}>{t("mobile.workingHours")}</Text>
          <Text style={styles.hours}>08:00 – 21:00</Text>
        </InfoCard>
        <InfoCard>
          <Text style={styles.sectionTitle}>{t("mobile.nextBooking")}</Text>
          {demoData ? (
            <View style={styles.timeline}>
              {demoData.appointments.map((appointment) => (
                <View key={appointment.id} style={styles.timelineRow}>
                  <Text style={styles.time}>{appointment.startsAt}</Text>
                  <View style={styles.event}>
                    <Text style={styles.eventTitle}>
                      {appointment.clientName}
                    </Text>
                    <Text style={styles.helper}>
                      {appointment.serviceName} · {appointment.durationMinutes}{" "}
                      min
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : calendar.isLoading ? (
            <Text style={styles.helper}>{t("common.loading")}</Text>
          ) : calendar.appointments.length ? (
            <View style={styles.timeline}>
              {calendar.appointments.map((appointment) => (
                <Pressable
                  accessibilityLabel={`${appointment.customer_name}, ${getAppointmentStatusLabel(appointment.status, t)}`}
                  accessibilityRole="button"
                  key={appointment.id}
                  onPress={() => onSelectAppointment?.(appointment)}
                  style={({ pressed }) => [
                    styles.timelineRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.time}>
                    {formatTime(new Date(appointment.starts_at), locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: workspace.timezone,
                    })}
                  </Text>
                  <View style={styles.event}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle}>
                        {appointment.customer_name}
                      </Text>
                      <AppointmentStatusBadge
                        label={getAppointmentStatusLabel(appointment.status, t)}
                        status={appointment.status}
                      />
                    </View>
                    <Text style={styles.helper}>
                      {appointment.service_name} ·{" "}
                      {appointment.duration_minutes} min
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>{t("mobile.noBookingsToday")}</Text>
          )}
        </InfoCard>
        {demoData && (
          <InfoCard>
            <Text style={styles.sectionTitle}>{t("mobile.freeSlots")}</Text>
            <Text style={styles.helper}>{demoData.freeSlots.join(" · ")}</Text>
          </InfoCard>
        )}
        <InfoCard>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>
                {t("mobile.personalBlocks")}
              </Text>
              <Text style={styles.helper}>
                {t("mobile.personalBlockDescription")}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!client}
              onPress={() => setBlockModalVisible(true)}
              style={({ pressed }) => [
                styles.addButton,
                !client && styles.disabled,
                pressed && styles.addButtonPressed,
              ]}
            >
              <Text style={styles.addButtonText}>
                {t("mobile.personalBlockAdd")}
              </Text>
            </Pressable>
          </View>
          {calendar.isLoading ? (
            <Text style={styles.helper}>{t("common.loading")}</Text>
          ) : calendar.blocks.length ? (
            <View style={styles.blocksList}>
              {calendar.blocks.map((block) => (
                <PersonalBlockRow
                  block={block}
                  key={block.id}
                  locale={locale}
                  onDelete={calendar.removeBlock}
                  t={t}
                  timezone={workspace.timezone}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>{t("mobile.personalBlockEmpty")}</Text>
          )}
          {calendar.error && !isBlockModalVisible ? (
            <Text style={styles.error}>{t("common.error")}</Text>
          ) : null}
        </InfoCard>
      </View>
      <PersonalBlockModal
        error={calendar.error}
        initialDate={calendar.selectedDate}
        isSaving={calendar.isSaving}
        onClose={() => setBlockModalVisible(false)}
        onSave={async (draft: PersonalBlockDraft) => {
          await calendar.saveBlock(draft);
          setBlockModalVisible(false);
        }}
        t={t}
        visible={isBlockModalVisible}
      />
    </>
  );
}

function PersonalBlockRow({
  block,
  locale,
  onDelete,
  t,
  timezone,
}: {
  readonly block: PersonalBlock;
  readonly locale: DashboardTabProps["locale"];
  readonly onDelete: (blockId: string) => Promise<void>;
  readonly t: DashboardTabProps["t"];
  readonly timezone: string;
}) {
  const date = formatDate(new Date(block.starts_at), locale, {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  });
  const start = formatTime(new Date(block.starts_at), locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
  const end = formatTime(new Date(block.ends_at), locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  return (
    <View style={styles.blockRow}>
      <View style={styles.blockCopy}>
        <Text style={styles.blockTitle}>
          {block.reason || t("mobile.personalBlocks")}
        </Text>
        <Text style={styles.helper}>
          {date} · {start} – {end}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`${t("mobile.personalBlockDelete")} ${block.reason || ""}`}
        accessibilityRole="button"
        onPress={() =>
          Alert.alert(
            t("mobile.personalBlockDelete"),
            block.reason || t("mobile.personalBlocks"),
            [
              { text: t("common.cancel"), style: "cancel" },
              {
                onPress: () => void onDelete(block.id).catch(() => undefined),
                text: t("mobile.personalBlockDelete"),
                style: "destructive",
              },
            ],
          )
        }
        style={styles.deleteButton}
      >
        <Text style={styles.deleteButtonText}>
          {t("mobile.personalBlockDelete")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  addButton: {
    backgroundColor: colors.action,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonPressed: { backgroundColor: colors.actionPressed },
  addButtonText: {
    ...typography.caption,
    color: colors.actionText,
    fontWeight: "700",
  },
  blockCopy: { flex: 1, gap: 2 },
  blockRow: {
    alignItems: "center",
    backgroundColor: colors.subtleSurface,
    borderLeftColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  blockTitle: { ...typography.label, color: colors.primaryText },
  blocksList: { gap: 8, marginTop: 14 },
  deleteButton: { paddingHorizontal: 4, paddingVertical: 8 },
  deleteButtonText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "700",
  },
  disabled: { opacity: 0.6 },
  dateNavigation: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  error: { ...typography.caption, color: colors.danger, marginTop: 12 },
  eyebrow: {
    color: colors.accent,
    marginBottom: 6,
    textTransform: "uppercase",
    ...typography.eyebrow,
  },
  helper: { ...typography.body, color: colors.secondaryText },
  hours: { ...typography.metric, color: colors.primaryText },
  event: {
    backgroundColor: colors.accentSoft,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    borderRadius: radii.control,
    flex: 1,
    padding: 10,
  },
  eventHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  eventTitle: { ...typography.label, color: colors.primaryText },
  pressed: { opacity: 0.78 },
  navigationButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  navigationButtonPressed: { backgroundColor: colors.subtleSurface },
  navigationButtonText: {
    color: colors.primaryText,
    fontSize: 28,
    lineHeight: 30,
  },
  todayButton: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.control,
    flex: 1,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  todayButtonText: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.primaryText,
    marginBottom: 10,
    ...typography.section,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionHeaderCopy: { flex: 1 },
  title: { ...typography.heading, color: colors.primaryText },
  time: { ...typography.caption, color: colors.secondaryText, width: 48 },
  timeline: { gap: 8 },
  timelineRow: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
});
