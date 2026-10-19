import type { Database } from "@schedule-app/api";
import {
  formatAccessibleDate,
  formatCompactDate,
  formatTime,
} from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { AvailabilityDateOverrideModal } from "../../components/AvailabilityDateOverrideModal";
import { BulkAvailabilityOverrideModal } from "../../components/BulkAvailabilityOverrideModal";
import {
  CalendarSlotActionModal,
  type CalendarTimeOption,
} from "../../components/CalendarSlotActionModal";
import { DashboardPageHeader } from "../../components/DashboardPageHeader";
import { InfoCard } from "../../components/InfoCard";
import { PersonalBlockModal } from "../../components/PersonalBlockModal";
import { WeeklyAvailabilityModal } from "../../components/WeeklyAvailabilityModal";
import type { DemoData } from "../../demo/types";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import {
  type AvailabilityDateSelectionSnapshot,
  type AvailabilityOverrideDraft,
  findAvailabilityConflicts,
  getEffectiveAvailability,
  summarizeAvailabilityDateSnapshots,
} from "../../features/availability/dateOverrides";
import type {
  PersonalBlock,
  PersonalBlockDraft,
} from "../../features/availability/personalBlocks";
import {
  createDefaultPersonalBlockDraft,
  formatDateInTimeZone,
  getPersonalBlockDraft,
  getPersonalBlockDraftForSlot,
} from "../../features/availability/personalBlocks";
import type { CalendarView } from "../../features/calendar/calendar";
import { getTodayCalendarDate } from "../../features/calendar/calendar";
import { getCalendarTimeOptions } from "../../features/calendar/calendarTimeOptions";
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
import type { useCalendarMonthWindow } from "../../features/calendar/useCalendarMonthWindow";
import {
  buildDemoWeekCalendar,
  buildWeekCalendar,
} from "../../features/calendar/weekCalendar";
import { spacing } from "../../theme/spacing";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import { CalendarMonthPickerSheet } from "./CalendarMonthPickerSheet";
import { CalendarPeriodNavigation } from "./CalendarPeriodNavigation";
import { DayTimeline } from "./DayTimeline";
import { MonthCalendar } from "./MonthCalendar";
import type { DashboardTabProps } from "./types";
import { WeekCalendar } from "./WeekCalendar";

type CalendarTabProps = DashboardTabProps & {
  readonly calendar: CalendarDataController;
  readonly monthWindow: ReturnType<typeof useCalendarMonthWindow>;
  readonly client: SupabaseClient<Database> | null;
  readonly demoData?: DemoData;
  readonly onSelectAppointment?: (appointment: MasterAppointment) => void;
  readonly onSelectTime?: (date: string, startsAt: string) => void;
  readonly onFeedback: (message: string) => void;
  readonly onWorkspaceSaved: () => void;
  readonly workspace: Workspace;
};

export function CalendarTab({
  calendar,
  monthWindow,
  client,
  demoData,
  locale,
  onSelectAppointment,
  onSelectTime,
  onFeedback,
  onWorkspaceSaved,
  t,
  workspace,
}: CalendarTabProps) {
  const [isBlockModalVisible, setBlockModalVisible] = useState(false);
  const [blockDraft, setBlockDraft] = useState(() =>
    createDefaultPersonalBlockDraft(calendar.selectedDate),
  );
  const [demoBlocks, setDemoBlocks] = useState(demoData?.personalBlocks ?? []);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isDaySettingsVisible, setDaySettingsVisible] = useState(false);
  const [isDateSelectionMode, setDateSelectionMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedDateSnapshots, setSelectedDateSnapshots] = useState<
    Record<string, AvailabilityDateSelectionSnapshot>
  >({});
  const [bulkMode, setBulkMode] = useState<"close" | "configure" | null>(null);
  const [isWeeklyAvailabilityVisible, setWeeklyAvailabilityVisible] =
    useState(false);
  const [processedDates, setProcessedDates] = useState<string[]>([]);
  const [slotAction, setSlotAction] = useState<{
    readonly date: string;
    readonly startsAt: string;
    readonly timeOptions: readonly string[];
  } | null>(null);
  const openSlotAction = (date: string, minute: number, endMinute: number) => {
    const timeOptions = getCalendarTimeOptions({
      date,
      endMinute,
      minute,
      timezone: workspace.timezone,
    });
    const startsAt =
      timeOptions[0] ??
      getDayTimelineSlotStart(date, minute, workspace.timezone);
    setSlotAction({
      date,
      startsAt,
      timeOptions: timeOptions.length ? timeOptions : [startsAt],
    });
  };
  const openBlockEditor = (
    initialDraft: PersonalBlockDraft,
    blockId: string | null = null,
  ) => {
    setBlockDraft(initialDraft);
    setEditingBlockId(blockId);
    setBlockModalVisible(true);
  };
  const previousNonMonthView = useRef<CalendarView>("day");
  const openMonthPicker = () => {
    if (calendar.view !== "month") previousNonMonthView.current = calendar.view;
    calendar.setView("month");
  };
  const closeMonthPicker = () => {
    setDateSelectionMode(false);
    setSelectedDates([]);
    setSelectedDateSnapshots({});
    setProcessedDates([]);
    setBulkMode(null);
    calendar.setView(previousNonMonthView.current);
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
        dateOverrides: calendar.dateOverrides,
        selectedDate: calendar.selectedDate,
        timezone: workspace.timezone,
      });
  const personalBlocks = demoData ? demoBlocks : calendar.blocks;
  const effectiveAvailability = getEffectiveAvailability(
    calendar.selectedDate,
    workspace.availabilityRules,
    calendar.dateOverrides,
  );
  const selectedDayOfWeek =
    new Date(`${calendar.selectedDate}T00:00:00.000Z`).getUTCDay() || 7;
  const selectedDayRule = workspace.availabilityRules.find(
    (rule) => rule.dayOfWeek === selectedDayOfWeek,
  );
  const dayStartTime =
    effectiveAvailability.startLocalTime ??
    selectedDayRule?.startLocalTime ??
    "09:00";
  const dayEndTime =
    effectiveAvailability.endLocalTime ??
    selectedDayRule?.endLocalTime ??
    "17:00";
  const selectedDayAppointments = calendar.appointments.filter(
    (appointment) =>
      formatDateInTimeZone(
        new Date(appointment.starts_at),
        workspace.timezone,
      ) === calendar.selectedDate,
  );
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
        dateOverrides: calendar.dateOverrides,
        selectedDate: calendar.selectedDate,
        timezone: workspace.timezone,
      });
  const todayDate = getTodayCalendarDate(workspace.timezone);
  const navigationDisabled = !client && !demoData;
  const monthAppointments = useMemo(
    () =>
      monthWindow.entries.flatMap((entry) => entry.data?.appointments ?? []),
    [monthWindow.entries],
  );
  const monthBlocks = useMemo(
    () => monthWindow.entries.flatMap((entry) => entry.data?.blocks ?? []),
    [monthWindow.entries],
  );
  const monthOverrides = useMemo(
    () =>
      monthWindow.entries.flatMap((entry) => entry.data?.dateOverrides ?? []),
    [monthWindow.entries],
  );
  const selectionSummary = useMemo(
    () =>
      summarizeAvailabilityDateSnapshots(Object.values(selectedDateSnapshots)),
    [selectedDateSnapshots],
  );
  const bulkActionDates =
    bulkMode === "close" ? selectionSummary.openDates : selectedDates;
  const appointmentsByDate = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(selectedDateSnapshots).map(([date, snapshot]) => [
          date,
          snapshot.appointments,
        ]),
      ),
    [selectedDateSnapshots],
  );
  const monthItems = monthWindow.entries.map((entry) => {
    const days: MonthCalendarDay[] = demoData
      ? buildDemoMonthCalendar(
          demoData.appointments,
          `${entry.month}-15`,
          calendar.selectedDate,
          todayDate,
        )
      : buildMonthCalendar({
          appointments: monthAppointments,
          availabilityRules: workspace.availabilityRules,
          blocks: monthBlocks,
          dateOverrides: monthOverrides,
          monthDate: `${entry.month}-15`,
          selectedDate: calendar.selectedDate,
          timezone: workspace.timezone,
          todayDate,
        });
    return { ...entry, days };
  });
  const weekRange = calendar.range;
  const isCurrentWeek =
    calendar.view === "week" &&
    todayDate >= weekRange.fromDate &&
    todayDate <= weekRange.toDate;
  const startDateSelection = () => {
    setSelectedDates([]);
    setSelectedDateSnapshots({});
    setProcessedDates([]);
    setDateSelectionMode(true);
  };
  const cancelDateSelection = () => {
    setSelectedDates([]);
    setSelectedDateSnapshots({});
    setProcessedDates([]);
    setDateSelectionMode(false);
  };
  const toggleSelectedDate = (date: string) => {
    setProcessedDates([]);
    const isSelected = selectedDates.includes(date);
    setSelectedDates((current) =>
      isSelected
        ? current.filter((selectedDate) => selectedDate !== date)
        : [...current, date].sort(),
    );
    setSelectedDateSnapshots((current) => {
      if (isSelected) {
        const remaining = { ...current };
        delete remaining[date];
        return remaining;
      }
      const month = monthItems.find((item) => item.month === date.slice(0, 7));
      const day = month?.days.find((candidate) => candidate.date === date);
      if (!day) return current;
      return {
        ...current,
        [date]: {
          appointments: findAvailabilityConflicts(monthAppointments, {
            date,
            endLocalTime: null,
            kind: "closed",
            startLocalTime: null,
            timezone: workspace.timezone,
          }),
          date,
          isClosed: day.isClosed,
        },
      };
    });
  };
  const applyBulkOverrides = async (drafts: AvailabilityOverrideDraft[]) => {
    await calendar.saveDateOverrides(drafts);
    setProcessedDates(drafts.map((draft) => draft.date));
    setSelectedDates([]);
    setSelectedDateSnapshots({});
    setBulkMode(null);
  };
  const applyWeeklyAvailability = async (
    drafts: Parameters<typeof calendar.saveWeeklyAvailability>[0],
  ) => {
    await calendar.saveWeeklyAvailability(drafts);
    onWorkspaceSaved();
    setWeeklyAvailabilityVisible(false);
    cancelDateSelection();
  };

  return (
    <>
      <View
        style={[
          styles.content,
          calendar.view === "month" && styles.fullscreenMonthContent,
        ]}
      >
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
                onPress={openMonthPicker}
              />
            </View>
          </View>
        </View>
        {calendar.view !== "month" ? (
          <InfoCard
            style={[
              styles.calendarCard,
              calendar.view === "week" && styles.weekInfoCard,
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
            <View style={styles.dayAvailabilityControl}>
              <Text style={styles.dayAvailabilityStatus}>
                {effectiveAvailability.isClosed
                  ? t("mobile.calendarDayClosedStatus")
                  : `${t("mobile.calendarDayWorkingHours")}: ${dayStartTime.slice(0, 5)}–${dayEndTime.slice(0, 5)}`}
              </Text>
              <ActionButton
                disabled={!client}
                label={t("mobile.calendarDaySettings")}
                onPress={() => setDaySettingsVisible(true)}
                size="compact"
                variant="secondary"
              />
            </View>
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
                        openSlotAction(
                          date,
                          minute,
                          week.find((day) => day.date === date)?.endMinute ??
                            17 * 60,
                        )
                    : undefined
                }
                selectedDate={calendar.selectedDate}
                t={t}
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
                        openSlotAction(
                          calendar.selectedDate,
                          minute,
                          timeline.endMinute,
                        )
                    : undefined
                }
                t={t}
                timeline={timeline}
              />
            )}
            {calendar.isLoading && !demoData ? (
              <View
                accessibilityLiveRegion="polite"
                pointerEvents="none"
                style={styles.calendarLoadingOverlay}
              >
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.calendarLoadingText}>
                  {t("common.loading")}
                </Text>
              </View>
            ) : null}
          </InfoCard>
        ) : null}
        <CalendarMonthPickerSheet
          closeLabel={t("common.close")}
          onClose={closeMonthPicker}
          title={
            isDateSelectionMode
              ? t("mobile.calendarSelectDays")
              : t("mobile.calendarSelectDate")
          }
          visible={calendar.view === "month"}
        >
          <MonthCalendar
            isLoadingNext={monthWindow.isLoadingNext}
            isLoadingPrevious={monthWindow.isLoadingPrevious}
            isBulkSaving={calendar.isSaving}
            loadNext={monthWindow.loadNext}
            loadPrevious={monthWindow.loadPrevious}
            locale={locale}
            months={monthItems}
            closedDateCount={selectionSummary.closedDates.length}
            onCancelSelection={cancelDateSelection}
            onCloseOpenDates={() => setBulkMode("close")}
            onConfigureSelectedDates={() => setBulkMode("configure")}
            onRepeatWeekly={() => setWeeklyAvailabilityVisible(true)}
            onSelectDate={(date) => {
              calendar.setSelectedDate(date);
              calendar.setView("day");
            }}
            onStartSelection={startDateSelection}
            onToggleDate={toggleSelectedDate}
            openDateCount={selectionSummary.openDates.length}
            processedDates={processedDates}
            selectedDates={selectedDates}
            selectionEnabled={Boolean(client)}
            selectionMode={isDateSelectionMode}
            t={t}
          />
        </CalendarMonthPickerSheet>
        <BulkAvailabilityOverrideModal
          appointmentsByDate={appointmentsByDate}
          closedDateCount={selectionSummary.closedDates.length}
          dates={bulkActionDates}
          error={calendar.error}
          isSaving={calendar.isSaving}
          locale={locale}
          mode={bulkMode ?? "close"}
          openDateCount={selectionSummary.openDates.length}
          onApply={applyBulkOverrides}
          onClose={() => setBulkMode(null)}
          t={t}
          timezone={workspace.timezone}
          visible={bulkMode !== null}
        />
        <WeeklyAvailabilityModal
          dates={selectedDates}
          error={calendar.error}
          isSaving={calendar.isSaving}
          locale={locale}
          onApply={applyWeeklyAvailability}
          onClose={() => setWeeklyAvailabilityVisible(false)}
          t={t}
          visible={isWeeklyAvailabilityVisible}
        />
        {calendar.view !== "month" ? (
          <InfoCard>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderCopy}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>
                    {t("mobile.personalBlocks")}
                  </Text>
                  {calendar.isRefreshing ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : null}
                </View>
                <Text style={styles.helper}>
                  {t("mobile.personalBlockDescription")}
                </Text>
              </View>
              <ActionButton
                disabled={!client}
                label={t("mobile.personalBlockAdd")}
                onPress={() =>
                  openBlockEditor(
                    createDefaultPersonalBlockDraft(calendar.selectedDate),
                  )
                }
                size="compact"
                variant="secondary"
              />
            </View>
            {calendar.isLoading && !calendar.isRefreshing ? (
              <Text style={styles.helper}>{t("common.loading")}</Text>
            ) : personalBlocks.length ? (
              <View style={styles.blocksList}>
                {personalBlocks.map((block) => (
                  <PersonalBlockRow
                    block={block}
                    key={block.id}
                    locale={locale}
                    onDelete={async (blockId) => {
                      if (demoData) {
                        setDemoBlocks((current) =>
                          current.filter((item) => item.id !== blockId),
                        );
                      } else {
                        await calendar.removeBlock(blockId);
                      }
                      onFeedback(t("mobile.personalBlockDeleted"));
                    }}
                    t={t}
                    timezone={workspace.timezone}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.helper}>
                {t("mobile.personalBlockEmpty")}
              </Text>
            )}
            {calendar.error && !isBlockModalVisible ? (
              <Text style={styles.error}>{t("common.error")}</Text>
            ) : null}
          </InfoCard>
        ) : null}
      </View>
      <AvailabilityDateOverrideModal
        appointments={selectedDayAppointments}
        date={calendar.selectedDate}
        endLocalTime={dayEndTime}
        error={calendar.error}
        hasOverride={calendar.dateOverrides.some(
          (override) => override.work_date === calendar.selectedDate,
        )}
        initialIsClosed={effectiveAvailability.isClosed}
        isSaving={calendar.isSaving}
        locale={locale}
        onClear={async () => {
          await calendar.clearDateOverride(calendar.selectedDate);
          setDaySettingsVisible(false);
          onFeedback(t("mobile.calendarDayResetDone"));
        }}
        onClose={() => setDaySettingsVisible(false)}
        onSave={async (draft: AvailabilityOverrideDraft) => {
          await calendar.saveDateOverride(draft);
          setDaySettingsVisible(false);
          onFeedback(
            t(
              draft.kind === "closed"
                ? "mobile.calendarDayClosedSaved"
                : "mobile.calendarDayHoursSaved",
            ),
          );
        }}
        startLocalTime={dayStartTime}
        t={t}
        timezone={workspace.timezone}
        visible={isDaySettingsVisible}
      />
      <PersonalBlockModal
        error={calendar.error}
        initialDraft={blockDraft}
        isEditing={editingBlockId !== null}
        isSaving={calendar.isSaving}
        locale={locale}
        onClose={() => setBlockModalVisible(false)}
        onDelete={
          editingBlockId
            ? async () => {
                await calendar.removeBlock(editingBlockId);
                setBlockModalVisible(false);
                setEditingBlockId(null);
                onFeedback(t("mobile.personalBlockDeleted"));
              }
            : undefined
        }
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
        dateLabel={
          slotAction
            ? formatAccessibleDate(
                new Date(slotAction.startsAt),
                locale,
                workspace.timezone,
              )
            : ""
        }
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
        onSelectTime={(startsAt) =>
          setSlotAction((current) =>
            current ? { ...current, startsAt } : current,
          )
        }
        selectedStartsAt={slotAction?.startsAt ?? ""}
        t={t}
        timeOptions={getFormattedTimeOptions(
          slotAction?.timeOptions ?? [],
          locale,
          workspace.timezone,
        )}
        visible={slotAction !== null}
      />
    </>
  );
}

function getFormattedTimeOptions(
  values: readonly string[],
  locale: DashboardTabProps["locale"],
  timezone: string,
): CalendarTimeOption[] {
  return values.map((startsAt) => ({
    label: formatTime(new Date(startsAt), locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }),
    startsAt,
  }));
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete(block.id);
      setIsConfirmingDelete(false);
    } catch {
      // The parent exposes the server error in the personal blocks card.
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <View
      testID={`personal-block-row-${block.id}`}
      style={[styles.blockRow, isConfirmingDelete && styles.blockRowConfirming]}
    >
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
      {isConfirmingDelete ? (
        <View style={styles.blockDeleteConfirmation}>
          <Text accessibilityRole="alert" style={styles.blockDeletePrompt}>
            {t("mobile.personalBlockDeleteConfirm")}
          </Text>
          <View style={styles.blockDeleteActions}>
            <ActionButton
              disabled={isDeleting}
              label={t("common.cancel")}
              onPress={() => setIsConfirmingDelete(false)}
              size="compact"
              variant="secondary"
            />
            <ActionButton
              disabled={isDeleting}
              label={t("mobile.personalBlockDelete")}
              loading={isDeleting}
              loadingLabel={t("common.loading")}
              onPress={() => void handleDelete()}
              size="compact"
              variant="destructiveConfirm"
            />
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityLabel={`${t("mobile.personalBlockDelete")} ${block.reason || ""}`}
          accessibilityRole="button"
          disabled={isDeleting}
          onPress={() => setIsConfirmingDelete(true)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>
            {t("mobile.personalBlockDelete")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.section },
  fullscreenMonthContent: { flex: 1, gap: 8, minHeight: 0 },
  blockCopy: { flex: 1, gap: 2 },
  blockRow: {
    alignItems: "center",
    backgroundColor: colors.subtleSurface,
    borderLeftColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: radii.surface,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  blockRowConfirming: { alignItems: "stretch", flexDirection: "column" },
  blockDeleteActions: { flexDirection: "row", gap: 8 },
  blockDeleteConfirmation: { gap: 8 },
  blockDeletePrompt: {
    ...typography.body,
    color: colors.danger,
    fontWeight: "600",
  },
  blockTitle: { ...typography.label, color: colors.primaryText },
  blocksList: { gap: 8, marginTop: 14 },
  calendarCard: { position: "relative" },
  dayAvailabilityControl: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dayAvailabilityStatus: {
    ...typography.label,
    color: colors.secondaryText,
    flex: 1,
  },
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
  deleteButton: {
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  deleteButtonText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "700",
  },
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
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.compact,
  },
  viewButton: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  viewButtonActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  viewButtonPressed: { opacity: 0.78 },
  viewButtonText: { ...typography.label, color: colors.secondaryText },
  viewButtonTextActive: { color: colors.accent, fontWeight: "700" },
  viewSwitcher: {
    alignSelf: "stretch",
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  weekInfoCard: { padding: 12 },
});
