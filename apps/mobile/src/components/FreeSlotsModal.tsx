import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate, formatTime } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import type { DemoData } from "../demo/types";
import { getDatesInDateRange } from "../features/appointments/freeSlotsDateRange";
import {
  listMasterMonthAvailableSlots,
  listMasterShareableFreeSlots,
  type MonthAvailableSlot,
  type ShareableFreeSlot,
} from "../features/appointments/manualBooking";
import {
  buildMonthAvailabilityCalendar,
  getAvailableDates,
} from "../features/appointments/monthAvailability";
import {
  captureFreeSlotsCard,
  shareFreeSlotsImage,
} from "../features/appointments/shareFreeSlotsImage";
import {
  addCalendarDays,
  getTodayCalendarDate,
  moveCalendarDate,
} from "../features/calendar/calendar";
import {
  getDayTimelineSlotStart,
  timeToMinutes,
} from "../features/calendar/dayTimeline";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service, Workspace } from "../types";
import { FreeSlotsShareCard } from "./FreeSlotsShareCard";
import { FullscreenModal } from "./FullscreenModal";
import { ServicePickerField } from "./ServicePickerField";

type FreeSlotsModalProps = {
  readonly client: SupabaseClient<Database> | null;
  readonly bookingUrl: string;
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
  bookingUrl,
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
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [slots, setSlots] = useState<MonthAvailableSlot[]>([]);
  const [shareSlots, setShareSlots] = useState<ShareableFreeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shareImage, setShareImage] = useState<{
    readonly key: string;
    readonly uri: string;
  } | null>(null);
  const [isPreparingShareImage, setIsPreparingShareImage] = useState(false);
  const [shareStatus, setShareStatus] = useState<
    "idle" | "opened" | "downloaded" | "failed"
  >("idle");
  const shareCardRef = useRef<ViewShotRef | null>(null);
  const shareStartDate = getTodayCalendarDate(workspace.timezone);
  const shareEndDate = addCalendarDays(shareStartDate, 13);

  useEffect(() => {
    if (!visible) return;
    setMonthDate(initialDate);
    setSelectedDate(initialDate);
    setSelectedStart(null);
    setServiceId(services[0]?.id ?? "");
    setActiveMode("share");
    setShareStatus("idle");
  }, [initialDate, services, visible]);

  useEffect(() => {
    if (!visible || demoData || !client) {
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setHasError(false);
    const request =
      activeMode === "share"
        ? listMasterShareableFreeSlots(
            client,
            workspace.id,
            shareStartDate,
            shareEndDate,
          ).then((result) => {
            if (active) setShareSlots(result);
          })
        : serviceId
          ? listMasterMonthAvailableSlots(
              client,
              workspace.id,
              serviceId,
              monthDate,
            ).then((result) => {
              if (active) setSlots(result);
            })
          : Promise.resolve();
    void request
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
    activeMode,
    client,
    demoData,
    monthDate,
    shareEndDate,
    shareStartDate,
    serviceId,
    visible,
    workspace.id,
  ]);

  const displaySlots = useMemo(() => {
    if (!demoData) {
      return activeMode === "share" ? shareSlots : slots;
    }
    const dates =
      activeMode === "share"
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
    shareSlots,
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
  const shareDates = useMemo(
    () => [...new Set(displaySlots.map((slot) => slot.available_date))].sort(),
    [displaySlots],
  );
  const shareSlotsByDate = useMemo(() => {
    const grouped = new Map<string, MonthAvailableSlot[]>();
    for (const slot of displaySlots) {
      const daySlots = grouped.get(slot.available_date) ?? [];
      daySlots.push(slot);
      grouped.set(slot.available_date, daySlots);
    }
    return grouped;
  }, [displaySlots]);
  const shareImageKey = JSON.stringify({
    bookingUrl,
    locale,
    slots: displaySlots.map(({ available_date, starts_at }) => [
      available_date,
      starts_at,
    ]),
    timezone: workspace.timezone,
    workspaceName: workspace.name,
  });
  useEffect(() => {
    if (
      !visible ||
      activeMode !== "share" ||
      !shareDates.length ||
      isLoading ||
      hasError ||
      !shareCardRef.current
    ) {
      setShareImage(null);
      setIsPreparingShareImage(false);
      return;
    }

    let active = true;
    const card = shareCardRef.current;
    const imageKey = shareImageKey;
    setShareImage(null);
    setIsPreparingShareImage(true);
    void captureFreeSlotsCard(card)
      .then((imageUri) => {
        if (!active) return;
        setShareImage({ key: imageKey, uri: imageUri });
        setShareStatus("idle");
        setIsPreparingShareImage(false);
      })
      .catch(() => {
        if (!active) return;
        setShareStatus("failed");
        setIsPreparingShareImage(false);
      });
    return () => {
      active = false;
    };
  }, [
    activeMode,
    hasError,
    isLoading,
    shareDates.length,
    shareImageKey,
    visible,
  ]);
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
  const shareDisabled =
    !shareDates.length || isLoading || hasError || isPreparingShareImage;

  async function shareSchedule() {
    if (shareDisabled) return;
    setShareStatus("idle");
    try {
      if (!shareCardRef.current) return;
      const result = await shareFreeSlotsImage(
        (shareImage?.key === shareImageKey && shareImage.uri) ||
          (await captureFreeSlotsCard(shareCardRef.current)),
        bookingUrl,
        t("mobile.freeSlots"),
      );
      setShareStatus(result === "cancelled" ? "idle" : result);
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
        {activeMode !== "share" ? (
          <Text style={styles.description}>
            {t("mobile.freeSlotsDescription")}
          </Text>
        ) : null}
        {activeMode === "share" ? null : (
          <>
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
          </>
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
        {isLoading ? (
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
          <ViewShot
            options={{ format: "png", quality: 1 }}
            ref={shareCardRef}
            style={styles.shareCardCapture}
          >
            <FreeSlotsShareCard
              bookingUrl={bookingUrl}
              dates={shareDates}
              locale={locale}
              slotsByDate={shareSlotsByDate}
              t={t}
              workspace={workspace}
            />
          </ViewShot>
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
  shareCardCapture: { alignSelf: "stretch" },
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
