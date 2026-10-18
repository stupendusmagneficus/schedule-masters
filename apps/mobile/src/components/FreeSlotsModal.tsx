import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate, formatTime } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { DemoData } from "../demo/types";
import {
  getDateRangeDayCount,
  getDatesInDateRange,
  getMonthStartsInDateRange,
  MAX_FREE_SLOTS_SHARE_DAYS,
} from "../features/appointments/freeSlotsDateRange";
import { buildFreeSlotsShareMessage } from "../features/appointments/freeSlotsShareMessage";
import {
  listMasterMonthAvailableSlots,
  type MonthAvailableSlot,
} from "../features/appointments/manualBooking";
import {
  buildMonthAvailabilityCalendar,
  getAvailableDates,
} from "../features/appointments/monthAvailability";
import { shareFreeSlotsGraphic } from "../features/appointments/shareFreeSlotsGraphic";
import { moveCalendarDate } from "../features/calendar/calendar";
import {
  getDayTimelineSlotStart,
  timeToMinutes,
} from "../features/calendar/dayTimeline";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service, Workspace } from "../types";
import { DateTimePickerField } from "./DateTimePickerField";
import { FullscreenModal } from "./FullscreenModal";
import { ServicePickerField } from "./ServicePickerField";

type FreeSlotsModalProps = {
  readonly client: SupabaseClient<Database> | null;
  readonly demoData?: DemoData;
  readonly initialDate: string;
  readonly locale: SupportedLocale;
  readonly onBook: (serviceId: string, date: string, startsAt: string) => void;
  readonly onClose: () => void;
  readonly services: readonly Service[];
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
  readonly workspace: Workspace;
};

export function FreeSlotsModal({
  client,
  demoData,
  initialDate,
  locale,
  onBook,
  onClose,
  services,
  t,
  visible,
  workspace,
}: FreeSlotsModalProps) {
  const [activeMode, setActiveMode] = useState<"share" | "book">("share");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [monthDate, setMonthDate] = useState(initialDate);
  const [shareStartDate, setShareStartDate] = useState(() =>
    getMonthBoundary(initialDate, "start"),
  );
  const [shareEndDate, setShareEndDate] = useState(() =>
    getMonthBoundary(initialDate, "end"),
  );
  const [shareFormat, setShareFormat] = useState<"text" | "graphic">("text");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [slots, setSlots] = useState<MonthAvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shareStatus, setShareStatus] = useState<
    "idle" | "opened" | "downloaded" | "failed"
  >("idle");
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    if (!visible) return;
    setMonthDate(initialDate);
    setShareStartDate(getMonthBoundary(initialDate, "start"));
    setShareEndDate(getMonthBoundary(initialDate, "end"));
    setShareFormat("text");
    setSelectedDate(initialDate);
    setSelectedStart(null);
    setServiceId(services[0]?.id ?? "");
    setActiveMode("share");
    setShareStatus("idle");
  }, [initialDate, services, visible]);

  const shareRangeDays = getDateRangeDayCount(shareStartDate, shareEndDate);
  const shareRangeValid =
    shareRangeDays !== null && shareRangeDays <= MAX_FREE_SLOTS_SHARE_DAYS;
  const queryMonthKey =
    activeMode === "share"
      ? shareRangeValid
        ? getMonthStartsInDateRange(shareStartDate, shareEndDate).join(",")
        : ""
      : `${monthDate.slice(0, 7)}-01`;

  useEffect(() => {
    if (!visible || !serviceId || demoData || !client || !queryMonthKey) {
      if (!demoData) setSlots([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setHasError(false);
    setSlots([]);
    void Promise.all(
      queryMonthKey
        .split(",")
        .map((month) =>
          listMasterMonthAvailableSlots(client, workspace.id, serviceId, month),
        ),
    )
      .then((monthSlots) => {
        if (!active) return;
        const availableSlots = monthSlots.flat();
        setSlots(availableSlots);
        setSelectedDate((current) =>
          availableSlots.some((slot) => slot.available_date === current)
            ? current
            : (availableSlots[0]?.available_date ??
              `${monthDate.slice(0, 7)}-01`),
        );
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    client,
    demoData,
    monthDate,
    queryMonthKey,
    serviceId,
    visible,
    workspace.id,
  ]);

  const displaySlots = useMemo(() => {
    if (!demoData) {
      return activeMode === "share"
        ? slots.filter(
            (slot) =>
              slot.available_date >= shareStartDate &&
              slot.available_date <= shareEndDate,
          )
        : slots;
    }
    const dates =
      activeMode === "share" && shareRangeValid
        ? getDatesInDateRange(shareStartDate, shareEndDate)
        : [selectedDate];
    return dates.flatMap((date) =>
      demoData.freeSlots.map((time): MonthAvailableSlot => {
        const startsAt = getDayTimelineSlotStart(
          date,
          timeToMinutes(time),
          workspace.timezone,
        );
        return {
          available_date: date,
          ends_at: new Date(
            new Date(startsAt).getTime() +
              demoData.primaryService.duration_minutes * 60_000,
          ).toISOString(),
          starts_at: startsAt,
        };
      }),
    );
  }, [
    activeMode,
    demoData,
    selectedDate,
    shareEndDate,
    shareRangeValid,
    shareStartDate,
    slots,
    workspace.timezone,
  ]);

  const calendar = useMemo(
    () => buildMonthAvailabilityCalendar(monthDate, displaySlots),
    [displaySlots, monthDate],
  );
  const availableDates = getAvailableDates(calendar.slotsByDate);
  const selectedDaySlots = calendar.slotsByDate.get(selectedDate) ?? [];
  const shareDates = [
    ...new Set(displaySlots.map((slot) => slot.available_date)),
  ]
    .filter((date) => date >= shareStartDate && date <= shareEndDate)
    .sort();
  const shareSlotsByDate = useMemo(() => {
    const grouped = new Map<string, MonthAvailableSlot[]>();
    for (const slot of displaySlots) {
      const daySlots = grouped.get(slot.available_date) ?? [];
      daySlots.push(slot);
      grouped.set(slot.available_date, daySlots);
    }
    return grouped;
  }, [displaySlots]);
  const weekdayLabels = calendar.dates.slice(0, 7).map((date) =>
    formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
      timeZone: "UTC",
      weekday: "short",
    }).replace(/\.$/, ""),
  );
  const monthLabel = formatDate(
    new Date(`${monthDate.slice(0, 7)}-15T12:00:00.000Z`),
    locale,
    { month: "long", timeZone: "UTC", year: "numeric" },
  );
  const selectedService = services.find((service) => service.id === serviceId);
  const shareMessage = buildFreeSlotsShareMessage({
    heading: t("mobile.freeSlots"),
    locale,
    serviceName: selectedService?.name ?? "",
    slots: displaySlots,
    timezone: workspace.timezone,
    workspaceName: workspace.name,
  });
  const shareDisabled =
    !selectedService ||
    !shareDates.length ||
    !shareRangeValid ||
    isLoading ||
    hasError;

  async function shareSchedule() {
    if (shareDisabled) return;
    setShareStatus("idle");
    try {
      if (shareFormat === "graphic") {
        const result = await shareFreeSlotsGraphic(
          shareCardRef,
          t("mobile.freeSlots"),
        );
        setShareStatus(result === "downloaded" ? "downloaded" : "opened");
        return;
      }
      const result = await Share.share({
        message: shareMessage,
        title: t("mobile.freeSlots"),
      });
      if (!result || result.action === Share.sharedAction) {
        setShareStatus("opened");
      }
    } catch {
      setShareStatus("failed");
    }
  }

  return (
    <FullscreenModal
      closeLabel={t("common.cancel")}
      onClose={onClose}
      title={t("mobile.freeSlots")}
      visible={visible}
      footer={
        activeMode === "share" ? (
          <View style={styles.footerContent}>
            {shareStatus !== "idle" ? (
              <Text
                accessibilityRole={
                  shareStatus === "failed" ? "alert" : undefined
                }
                style={
                  shareStatus === "failed" ? styles.errorMessage : styles.helper
                }
              >
                {t(
                  shareStatus === "failed"
                    ? "mobile.freeSlotsShareFailed"
                    : shareStatus === "downloaded"
                      ? "mobile.freeSlotsShareDownloaded"
                      : "mobile.freeSlotsShareOpened",
                )}
              </Text>
            ) : null}
            <PrimaryButton
              disabled={shareDisabled}
              label={t("mobile.freeSlotsShareAction")}
              onPress={() => void shareSchedule()}
            />
          </View>
        ) : (
          <PrimaryButton
            disabled={!selectedService || !selectedStart || isLoading}
            label={t("mobile.freeSlotsBook")}
            onPress={() => {
              if (selectedService && selectedStart) {
                onBook(selectedService.id, selectedDate, selectedStart);
              }
            }}
          />
        )
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View accessibilityRole="tablist" style={styles.modeTabs}>
          <ModeTab
            active={activeMode === "share"}
            label={t("mobile.freeSlotsShareTab")}
            onPress={() => {
              setActiveMode("share");
              setShareStatus("idle");
            }}
          />
          <ModeTab
            active={activeMode === "book"}
            label={t("mobile.freeSlotsBookTab")}
            onPress={() => {
              setActiveMode("book");
              setShareStatus("idle");
            }}
          />
        </View>
        <Text style={styles.description}>
          {t(
            activeMode === "share"
              ? "mobile.freeSlotsShareDescription"
              : "mobile.freeSlotsDescription",
          )}
        </Text>
        <Text style={styles.sectionTitle}>
          {t("mobile.freeSlotsChooseService")}
        </Text>
        <ServicePickerField
          label={t("mobile.freeSlotsChooseService")}
          locale={locale}
          onSelect={(service) => {
            setServiceId(service.id);
            setSelectedStart(null);
            setShareStatus("idle");
          }}
          selectedService={selectedService ?? null}
          services={services}
          t={t}
        />

        {activeMode === "share" ? (
          <>
            <Text style={styles.sectionTitle}>
              {t("mobile.freeSlotsSharePeriod")}
            </Text>
            <View style={styles.dateRange}>
              <DateTimePickerField
                label={t("mobile.freeSlotsShareStartDate")}
                locale={locale}
                mode="date"
                onChange={(date) => {
                  setShareStartDate(date);
                  setShareStatus("idle");
                }}
                placeholder={t("mobile.freeSlotsShareStartDate")}
                t={t}
                value={shareStartDate}
              />
              <DateTimePickerField
                label={t("mobile.freeSlotsShareEndDate")}
                locale={locale}
                mode="date"
                onChange={(date) => {
                  setShareEndDate(date);
                  setShareStatus("idle");
                }}
                placeholder={t("mobile.freeSlotsShareEndDate")}
                t={t}
                value={shareEndDate}
              />
            </View>
            <Text style={styles.helper}>
              {t("mobile.freeSlotsShareRangeLimit")}
            </Text>
            {shareRangeDays === null ? (
              <Text accessibilityRole="alert" style={styles.errorMessage}>
                {t("mobile.freeSlotsShareInvalidRange")}
              </Text>
            ) : !shareRangeValid ? (
              <Text accessibilityRole="alert" style={styles.errorMessage}>
                {t("mobile.freeSlotsShareRangeTooLong")}
              </Text>
            ) : null}
            <Text style={styles.sectionTitle}>
              {t("mobile.freeSlotsShareFormat")}
            </Text>
            <View accessibilityRole="tablist" style={styles.modeTabs}>
              <ModeTab
                active={shareFormat === "text"}
                label={t("mobile.freeSlotsShareTextFormat")}
                onPress={() => {
                  setShareFormat("text");
                  setShareStatus("idle");
                }}
              />
              <ModeTab
                active={shareFormat === "graphic"}
                label={t("mobile.freeSlotsShareGraphicFormat")}
                onPress={() => {
                  setShareFormat("graphic");
                  setShareStatus("idle");
                }}
              />
            </View>
            <Text style={styles.sectionTitle}>
              {t("mobile.freeSlotsSharePreview")}
            </Text>
          </>
        ) : (
          <View style={styles.monthHeader}>
            <Pressable
              accessibilityLabel={t("mobile.calendarPreviousMonth")}
              accessibilityRole="button"
              onPress={() => {
                const previous = moveCalendarDate(monthDate, "month", -1);
                setMonthDate(previous);
                setSelectedDate(previous);
                setSelectedStart(null);
                setShareStatus("idle");
              }}
              style={styles.monthArrow}
            >
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={styles.monthTitle}>
              {monthLabel}
            </Text>
            <Pressable
              accessibilityLabel={t("mobile.calendarNextMonth")}
              accessibilityRole="button"
              onPress={() => {
                const next = moveCalendarDate(monthDate, "month", 1);
                setMonthDate(next);
                setSelectedDate(next);
                setSelectedStart(null);
                setShareStatus("idle");
              }}
              style={styles.monthArrow}
            >
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </View>
        )}
        {activeMode === "book" ? (
          <>
            <Text style={styles.sectionTitle}>
              {t("mobile.freeSlotsChooseDate")}
            </Text>
            <View style={styles.calendar}>
              {weekdayLabels.map((label, index) => (
                <Text key={String(index)} style={styles.weekday}>
                  {label}
                </Text>
              ))}
              {calendar.dates.map((date) => {
                const available = availableDates.has(date);
                const inMonth = date.slice(0, 7) === monthDate.slice(0, 7);
                const selected = date === selectedDate;
                return (
                  <Pressable
                    accessibilityLabel={formatDate(
                      new Date(`${date}T12:00:00.000Z`),
                      locale,
                      {
                        day: "numeric",
                        month: "long",
                        timeZone: "UTC",
                        year: "numeric",
                      },
                    )}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: !available || !inMonth,
                      selected,
                    }}
                    aria-pressed={selected}
                    disabled={!available || !inMonth || isLoading}
                    key={date}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedStart(null);
                    }}
                    style={[
                      styles.day,
                      !inMonth && styles.outsideDay,
                      available && styles.availableDay,
                      selected && styles.selectedDay,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !available && styles.disabledDayText,
                        selected && styles.selectedDayText,
                      ]}
                    >
                      {Number(date.slice(-2))}
                    </Text>
                    {available ? (
                      <View
                        style={[
                          styles.availabilityDot,
                          selected && styles.selectedDot,
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>
              {t("mobile.freeSlotsChooseTime")}
            </Text>
          </>
        ) : null}
        {activeMode === "share" && !shareRangeValid ? null : isLoading ? (
          <View accessibilityLiveRegion="polite" style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.helper}>{t("common.loading")}</Text>
          </View>
        ) : hasError ? (
          <Text accessibilityRole="alert" style={styles.message}>
            {t("mobile.freeSlotsLoadFailed")}
          </Text>
        ) : activeMode === "share" && !shareDates.length ? (
          <Text style={styles.message}>
            {t("mobile.freeSlotsShareNoAvailability")}
          </Text>
        ) : activeMode === "book" && !availableDates.size ? (
          <Text style={styles.message}>
            {t("mobile.freeSlotsNoAvailability")}
          </Text>
        ) : activeMode === "share" ? (
          shareFormat === "text" ? (
            <View style={styles.shareSchedule}>
              {shareDates.map((date) => (
                <View key={date} style={styles.shareDay}>
                  <Text style={styles.shareDate}>
                    {formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                      year: "numeric",
                    })}
                  </Text>
                  <Text style={styles.shareTimes}>
                    {(shareSlotsByDate.get(date) ?? [])
                      .map((slot) =>
                        formatTime(new Date(slot.starts_at), locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: workspace.timezone,
                        }),
                      )
                      .join(" · ")}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View
              ref={shareCardRef}
              collapsable={false}
              style={styles.graphicCard}
            >
              <View style={styles.graphicHeader}>
                <Text style={styles.graphicBrand}>Schedule Masters</Text>
                <Text style={styles.graphicBadge}>{t("mobile.freeSlots")}</Text>
              </View>
              <Text style={styles.graphicTitle}>
                {t("mobile.freeSlotsShareGraphicTitle")}
              </Text>
              <Text style={styles.graphicWorkspace}>{workspace.name}</Text>
              {selectedService?.name ? (
                <Text style={styles.graphicService}>
                  {selectedService.name}
                </Text>
              ) : null}
              {shareDates.map((date) => (
                <View key={date} style={styles.graphicDay}>
                  <Text style={styles.graphicDate}>
                    {formatDate(new Date(`${date}T12:00:00.000Z`), locale, {
                      day: "numeric",
                      month: "short",
                      weekday: "short",
                      timeZone: "UTC",
                    })}
                  </Text>
                  <Text style={styles.graphicTimes}>
                    {(shareSlotsByDate.get(date) ?? [])
                      .map((slot) =>
                        formatTime(new Date(slot.starts_at), locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: workspace.timezone,
                        }),
                      )
                      .join(" · ")}
                  </Text>
                </View>
              ))}
            </View>
          )
        ) : !selectedDaySlots.length ? (
          <Text style={styles.message}>{t("mobile.freeSlotsNoSlots")}</Text>
        ) : (
          <View style={styles.slots}>
            {selectedDaySlots.map((slot) => {
              const selected = selectedStart === slot.starts_at;
              return (
                <Pressable
                  accessibilityLabel={formatTime(
                    new Date(slot.starts_at),
                    locale,
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: workspace.timezone,
                    },
                  )}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  aria-pressed={selected}
                  key={slot.starts_at}
                  onPress={() => setSelectedStart(slot.starts_at)}
                  style={[styles.slot, selected && styles.slotSelected]}
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    numberOfLines={1}
                    style={[
                      styles.slotText,
                      selected && styles.slotTextSelected,
                    ]}
                  >
                    {formatTime(new Date(slot.starts_at), locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: workspace.timezone,
                    })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </FullscreenModal>
  );
}

function ModeTab({
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
      aria-selected={active}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeTab,
        active && styles.modeTabActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PrimaryButton({
  disabled,
  label,
  onPress,
}: {
  readonly disabled: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bookButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.bookButtonText}>{label}</Text>
    </Pressable>
  );
}

function getMonthBoundary(date: string, edge: "start" | "end") {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  if (edge === "start") return `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  arrowText: { color: colors.primaryText, fontSize: 24, lineHeight: 28 },
  availabilityDot: {
    backgroundColor: colors.accent,
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  availableDay: { backgroundColor: colors.accentSoft },
  bookButton: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
  },
  bookButtonText: {
    ...typography.label,
    color: colors.actionText,
    fontWeight: "700",
  },
  calendar: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  content: { gap: 14, padding: 16, paddingBottom: 24 },
  day: {
    alignItems: "center",
    borderRadius: radii.control,
    height: 44,
    justifyContent: "center",
    width: "14.2857%",
  },
  dayText: { color: colors.primaryText, fontSize: 14, lineHeight: 17 },
  dateRange: { flexDirection: "row", gap: 12 },
  description: {
    ...typography.body,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  disabled: { opacity: 0.48 },
  disabledDayText: { color: colors.border },
  helper: { ...typography.caption, color: colors.secondaryText },
  monthArrow: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  monthTitle: {
    ...typography.section,
    color: colors.primaryText,
    textTransform: "capitalize",
  },
  message: {
    ...typography.body,
    color: colors.secondaryText,
    paddingVertical: 8,
  },
  modeTabs: {
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  modeTab: {
    alignItems: "center",
    borderRadius: radii.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
  },
  modeTabActive: { backgroundColor: colors.surface },
  modeTabText: {
    ...typography.label,
    color: colors.secondaryText,
    textAlign: "center",
  },
  modeTabTextActive: { color: colors.primaryText, fontWeight: "700" },
  footerContent: { gap: 8 },
  errorMessage: { ...typography.caption, color: colors.danger },
  graphicBadge: {
    ...typography.caption,
    color: colors.actionText,
    fontWeight: "700",
  },
  graphicBrand: {
    ...typography.label,
    color: colors.actionText,
    fontWeight: "700",
  },
  graphicCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: 1,
    overflow: "hidden",
  },
  graphicDate: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "700",
    width: "34%",
  },
  graphicDay: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    paddingVertical: 8,
  },
  graphicHeader: {
    alignItems: "center",
    backgroundColor: colors.action,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  graphicService: {
    ...typography.caption,
    color: colors.accent,
    marginBottom: 8,
  },
  graphicTimes: {
    ...typography.caption,
    color: colors.secondaryText,
    flex: 1,
  },
  graphicTitle: {
    ...typography.section,
    color: colors.primaryText,
    fontWeight: "700",
    marginBottom: 4,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  graphicWorkspace: {
    ...typography.label,
    color: colors.secondaryText,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  shareSchedule: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: 1,
    overflow: "hidden",
  },
  shareDay: {
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  shareDate: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
  },
  shareTimes: { ...typography.body, color: colors.secondaryText },
  outsideDay: { opacity: 0 },
  pressed: { opacity: 0.78 },
  sectionTitle: {
    ...typography.label,
    color: colors.primaryText,
    fontWeight: "700",
    marginTop: 4,
  },
  selectedDay: { backgroundColor: colors.accent },
  selectedDayText: { color: colors.surface, fontWeight: "700" },
  selectedDot: { backgroundColor: colors.surface },
  slot: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 48,
    minWidth: 0,
    justifyContent: "center",
    width: "31%",
  },
  slotSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  slotText: {
    ...typography.label,
    color: colors.primaryText,
    textAlign: "center",
    width: "100%",
  },
  slotTextSelected: { color: colors.surface, fontWeight: "700" },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 16,
  },
  status: { alignItems: "center", flexDirection: "row", gap: 10 },
  weekday: {
    color: colors.secondaryText,
    textAlign: "center",
    width: "14.2857%",
  },
});
