import type { Database } from "@schedule-app/api";
import {
  formatAccessibleDate,
  formatCompactDate,
  formatTime,
} from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CalendarSlotActionModal } from "../../components/CalendarSlotActionModal";
import { DashboardPageHeader } from "../../components/DashboardPageHeader";
import { InfoCard } from "../../components/InfoCard";
import { PersonalBlockModal } from "../../components/PersonalBlockModal";
import type { DemoData } from "../../demo/types";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import type {
  PersonalBlock,
  PersonalBlockDraft,
} from "../../features/availability/personalBlocks";
import {
  createDefaultPersonalBlockDraft,
  getPersonalBlockDraft,
  getPersonalBlockDraftForSlot,
} from "../../features/availability/personalBlocks";
import { getTodayCalendarDate } from "../../features/calendar/calendar";
import {
  buildDayTimeline,
  buildDemoDayTimeline,
  getDayTimelineSlotStart,
} from "../../features/calendar/dayTimeline";
import { buildDemoMonthCalendar } from "../../features/calendar/demoMonthCalendar";
import {
  buildMonthCalendar,
  type MonthCalendarDay,
} from "../../features/calendar/monthCalendar";
import {
  type CalendarDataController,
  getAccessibleCalendarLabel,
  getCalendarDateLabel,
  getCalendarWeekLabel,
} from "../../features/calendar/useCalendarData";
import {
  buildDemoWeekCalendar,
  buildWeekCalendar,
} from "../../features/calendar/weekCalendar";
import { spacing } from "../../theme/spacing";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import { CalendarPeriodNavigation } from "./CalendarPeriodNavigation";
import { DayTimeline } from "./DayTimeline";
import { MonthCalendar } from "./MonthCalendar";
import type { DashboardTabProps } from "./types";
import { WeekCalendar } from "./WeekCalendar";

type CalendarTabProps = DashboardTabProps & {
  readonly calendar: CalendarDataController;
  readonly client: SupabaseClient<Database> | null;
  readonly demoData?: DemoData;
  readonly onSelectAppointment?: (appointment: MasterAppointment) => void;
  readonly onSelectTime?: (date: string, startsAt: string) => void;
  readonly onFeedback: (message: string) => void;
  readonly workspace: Workspace;
};

export function CalendarTab({
  calendar,
  client,
  demoData,
  locale,
  onSelectAppointment,
  onSelectTime,
  onFeedback,
  t,
  workspace,
}: CalendarTabProps) {
  const [isBlockModalVisible, setBlockModalVisible] = useState(false);
  const [blockDraft, setBlockDraft] = useState(() =>
    createDefaultPersonalBlockDraft(calendar.selectedDate),
  );
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [slotAction, setSlotAction] = useState<{
    readonly date: string;
    readonly startsAt: string;
  } | null>(null);
  const openBlockEditor = (
    initialDraft: PersonalBlockDraft,
    blockId: string | null = null,
  ) => {
    setBlockDraft(initialDraft);
    setEditingBlockId(blockId);
    setBlockModalVisible(true);
  };
  const dateLabel =
    calendar.view === "week"
      ? getCalendarWeekLabel(calendar.selectedDate, locale, workspace.timezone)
      : getCalendarDateLabel(calendar.selectedDate, locale, workspace.timezone);
  const timeline = demoData
    ? buildDemoDayTimeline(demoData.appointments)
    : buildDayTimeline({
        appointments: calendar.appointments,
        availabilityRules: workspace.availabilityRules,
        blocks: calendar.blocks,
        selectedDate: calendar.selectedDate,
        timezone: workspace.timezone,
      });
  const week = demoData
    ? buildDemoWeekCalendar(
        demoData.appointments,
        calendar.selectedDate,
        workspace.timezone,
      )
    : buildWeekCalendar({
        appointments: calendar.appointments,
        availabilityRules: workspace.availabilityRules,
        blocks: calendar.blocks,
        selectedDate: calendar.selectedDate,
        timezone: workspace.timezone,
      });
  const todayDate = getTodayCalendarDate(workspace.timezone);
  const navigationDisabled = !client && !demoData;
  const month: MonthCalendarDay[] = demoData
    ? buildDemoMonthCalendar(
        demoData.appointments,
        calendar.selectedDate,
        todayDate,
      )
    : buildMonthCalendar({
        appointments: calendar.appointments,
        availabilityRules: workspace.availabilityRules,
        blocks: calendar.blocks,
        selectedDate: calendar.selectedDate,
        timezone: workspace.timezone,
        todayDate,
      });

  const weekRange = calendar.range;
  const isCurrentWeek =
    calendar.view === "week" &&
    todayDate >= weekRange.fromDate &&
    todayDate <= weekRange.toDate;

  return (
    <>
      <View style={styles.content}>
        <View>
          <DashboardPageHeader title={t("mobile.calendar")} />
          <View style={styles.calendarToolbar}>
            <View accessibilityRole="tablist" style={styles.viewSwitcher}>
              <CalendarViewButton
                active={calendar.view === "day"}
                label={t("mobile.calendarDayView")}
                onPress={() => calendar.setView("day")}
              />
              <CalendarViewButton
                active={calendar.view === "week"}
                label={t("mobile.calendarWeekView")}
                onPress={() => calendar.setView("week")}
              />
              <CalendarViewButton
                active={calendar.view === "month"}
                label={t("mobile.calendarMonthView")}
                onPress={() => calendar.setView("month")}
              />
            </View>
          </View>
        </View>
        <InfoCard
          style={[
            styles.calendarCard,
            calendar.view === "week" && styles.weekInfoCard,
            calendar.view === "month" && styles.monthInfoCard,
          ]}
        >
          {calendar.view === "day" ? (
            <CalendarPeriodNavigation
              disabled={navigationDisabled}
              nextLabel={t("mobile.calendarNext")}
              onNext={calendar.goToNext}
              onPrevious={calendar.goToPrevious}
              onToday={
                calendar.selectedDate === todayDate
                  ? undefined
                  : calendar.goToToday
              }
              previousLabel={t("mobile.calendarPrevious")}
              subtitle={dateLabel}
              subtitleAccessibilityLabel={getAccessibleCalendarLabel(
                calendar.selectedDate,
                "day",
                locale,
                workspace.timezone,
              )}
              t={t}
              title={t("mobile.daySchedule")}
              todayLabel={t("mobile.today")}
            />
          ) : null}
          {calendar.view === "week" ? (
            <WeekCalendar
              days={week}
              disabled={navigationDisabled}
              locale={locale}
              isCurrentWeek={isCurrentWeek}
              onNext={calendar.goToNext}
              onPressAppointment={onSelectAppointment}
              onPressBlock={(block) =>
                openBlockEditor(
                  getPersonalBlockDraft(block, workspace.timezone),
                  block.id,
                )
              }
              onPrevious={calendar.goToPrevious}
              onPressDay={(date) => {
                calendar.setSelectedDate(date);
              }}
              onToday={calendar.goToToday}
              weekLabel={dateLabel}
              onPressTime={
                onSelectTime
                  ? (date, minute) =>
                      setSlotAction({
                        date,
                        startsAt: getDayTimelineSlotStart(
                          date,
                          minute,
                          workspace.timezone,
                        ),
                      })
                  : undefined
              }
              selectedDate={calendar.selectedDate}
              t={t}
              timezone={workspace.timezone}
            />
          ) : calendar.view === "month" ? (
            <MonthCalendar
              days={month}
              disabled={navigationDisabled}
              locale={locale}
              onNext={calendar.goToNext}
              onOpenSelectedDay={() => calendar.setView("day")}
              onPrevious={calendar.goToPrevious}
              onSelectDate={calendar.setSelectedDate}
              onToday={calendar.goToToday}
              selectedDate={calendar.selectedDate}
              t={t}
              todayDate={todayDate}
              timezone={workspace.timezone}
            />
          ) : (
            <DayTimeline
              onPressAppointment={onSelectAppointment}
              onPressBlock={(block) =>
                openBlockEditor(
                  getPersonalBlockDraft(block, workspace.timezone),
                  block.id,
                )
              }
              onPressEmptySlot={
                onSelectTime
                  ? (minute) =>
                      setSlotAction({
                        date: calendar.selectedDate,
                        startsAt: getDayTimelineSlotStart(
                          calendar.selectedDate,
                          minute,
                          workspace.timezone,
                        ),
                      })
                  : undefined
              }
              t={t}
              timeline={timeline}
            />
          )}
          {calendar.isLoading && !demoData ? (
            <View
              accessibilityLiveRegion="polite"
              style={styles.calendarLoadingOverlay}
            >
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={styles.calendarLoadingText}>
                {t("common.loading")}
              </Text>
            </View>
          ) : null}
        </InfoCard>
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
              onPress={() =>
                openBlockEditor(
                  createDefaultPersonalBlockDraft(calendar.selectedDate),
                )
              }
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
                  onDelete={async (blockId) => {
                    await calendar.removeBlock(blockId);
                    onFeedback(t("mobile.personalBlockDeleted"));
                  }}
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
        initialDraft={blockDraft}
        isEditing={editingBlockId !== null}
        isSaving={calendar.isSaving}
        locale={locale}
        onClose={() => setBlockModalVisible(false)}
        onSave={async (draft: PersonalBlockDraft) => {
          if (editingBlockId) {
            await calendar.updateBlock(editingBlockId, draft);
          } else {
            await calendar.saveBlock(draft);
          }
          setBlockModalVisible(false);
          setEditingBlockId(null);
          onFeedback(
            t(
              editingBlockId
                ? "mobile.personalBlockUpdated"
                : "mobile.personalBlockCreated",
            ),
          );
        }}
        t={t}
        visible={isBlockModalVisible}
      />
      <CalendarSlotActionModal
        canCreateBreak={Boolean(client)}
        onAddBreak={() => {
          if (!slotAction) return;
          openBlockEditor(
            getPersonalBlockDraftForSlot(
              slotAction.startsAt,
              workspace.timezone,
            ),
          );
        }}
        onAddBooking={() => {
          if (slotAction) onSelectTime?.(slotAction.date, slotAction.startsAt);
        }}
        onClose={() => setSlotAction(null)}
        t={t}
        timeLabel={
          slotAction
            ? formatTime(new Date(slotAction.startsAt), locale, {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: workspace.timezone,
              })
            : ""
        }
        visible={slotAction !== null}
      />
    </>
  );
}

function CalendarViewButton({
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
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.viewButton,
        active && styles.viewButtonActive,
        pressed && styles.viewButtonPressed,
      ]}
    >
      <Text
        style={[styles.viewButtonText, active && styles.viewButtonTextActive]}
      >
        {label}
      </Text>
    </Pressable>
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
  const date = formatCompactDate(new Date(block.starts_at), locale, {
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
        <Text
          accessibilityLabel={`${formatAccessibleDate(
            new Date(block.starts_at),
            locale,
            timezone,
          )}, ${start} – ${end}`}
          style={styles.helper}
        >
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
  content: { gap: spacing.section },
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
  calendarCard: { position: "relative" },
  calendarLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderRadius: radii.surface,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    zIndex: 1,
  },
  calendarLoadingText: {
    ...typography.caption,
    color: colors.secondaryText,
    fontWeight: "600",
  },
  calendarToolbar: {
    alignItems: "stretch",
    gap: 8,
    marginTop: 8,
  },
  deleteButton: { paddingHorizontal: 4, paddingVertical: 8 },
  deleteButtonText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "700",
  },
  disabled: { opacity: 0.6 },
  error: { ...typography.caption, color: colors.danger, marginTop: 12 },
  helper: { ...typography.body, color: colors.secondaryText },
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
  viewButton: {
    alignItems: "center",
    borderRadius: radii.control,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  viewButtonActive: { backgroundColor: colors.surface },
  viewButtonPressed: { opacity: 0.78 },
  viewButtonText: { ...typography.label, color: colors.secondaryText },
  viewButtonTextActive: { color: colors.primaryText, fontWeight: "700" },
  viewSwitcher: {
    alignSelf: "stretch",
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  weekInfoCard: { padding: 12 },
  monthInfoCard: { padding: 14 },
});
