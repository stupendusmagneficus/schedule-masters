import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate, formatTime } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import type { DemoData } from "../demo/types";
import {
  getDatesInDateRange,
  getFreeSlotsShareRangeError,
  isValidFreeSlotsShareRange,
} from "../features/appointments/freeSlotsDateRange";
import { buildFreeSlotsShareMessage } from "../features/appointments/freeSlotsShareMessage";
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
import { DateTimePickerField } from "./DateTimePickerField";
import { FreeSlotsShareCard } from "./FreeSlotsShareCard";
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
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [shareStartDate, setShareStartDate] = useState(() =>
    getTodayCalendarDate(workspace.timezone),
  );
  const [shareEndDate, setShareEndDate] = useState(() =>
    addCalendarDays(getTodayCalendarDate(workspace.timezone), 13),
  );
  const [shareFormat, setShareFormat] = useState<"text" | "image">("text");
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [slots, setSlots] = useState<MonthAvailableSlot[]>([]);
  const [shareSlots, setShareSlots] = useState<ShareableFreeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shareStatus, setShareStatus] = useState<
    "idle" | "opened" | "downloaded" | "failed"
  >("idle");
  const shareCardRef = useRef<View>(null);
  const shareRangeValid = isValidFreeSlotsShareRange(
    shareStartDate,
    shareEndDate,
  );

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
    if (
      !visible ||
      demoData ||
      !client ||
      (activeMode === "share" && !shareRangeValid)
    ) {
      if (activeMode === "share" && !shareRangeValid) setShareSlots([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setHasError(false);
    if (activeMode === "share") setShareSlots([]);
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
    shareRangeValid,
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
  const shareDates = [
    ...new Set(displaySlots.map((slot) => slot.available_date)),
  ].sort();
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
    availabilityNote: t("mobile.freeSlotsShareAvailabilityNote"),
    heading: t("mobile.freeSlots"),
    locale,
    slots: displaySlots,
    timezone: workspace.timezone,
    workspaceName: workspace.name,
  });
  const shareDisabled =
    !shareRangeValid || !shareDates.length || isLoading || hasError;
  const shareCardDays = shareDates.map((date) => ({
    date,
    times: (shareSlotsByDate.get(date) ?? []).map((slot) =>
      formatTime(new Date(slot.starts_at), locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: workspace.timezone,
      }),
    ),
  }));
  const periodLabel = `${formatDate(
    new Date(`${shareStartDate}T12:00:00.000Z`),
    locale,
    { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" },
  )} – ${formatDate(new Date(`${shareEndDate}T12:00:00.000Z`), locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  })}`;

  async function shareSchedule() {
    if (shareDisabled) return;
    setShareStatus("idle");
    try {
      if (shareFormat === "image") {
        if (!shareCardRef.current) throw new Error("Share card is unavailable");
        const imageUri = await captureRef(shareCardRef, {
          format: "png",
          quality: 1,
          result: Platform.OS === "web" ? "data-uri" : "tmpfile",
        });
        if (Platform.OS === "web") {
          const imageFile = await createShareImageFile(imageUri);
          const webNavigator = (
            globalThis as typeof globalThis & { navigator?: WebShareNavigator }
          ).navigator;
          if (!webNavigator) throw new Error("Web sharing is unavailable");
          if (
            webNavigator.share &&
            webNavigator.canShare?.({ files: [imageFile] })
          ) {
            await webNavigator.share({
              files: [imageFile],
              title: t("mobile.freeSlots"),
            });
            setShareStatus("opened");
          } else {
            downloadShareImage(imageFile);
            setShareStatus("downloaded");
          }
        } else {
          await Sharing.shareAsync(imageUri, {
            dialogTitle: t("mobile.freeSlots"),
            mimeType: "image/png",
            UTI: "public.png",
          });
          setShareStatus("opened");
        }
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
        {activeMode === "share" ? (
          <>
            <Text style={styles.sectionTitle}>
              {t("mobile.freeSlotsSharePeriod")}
            </Text>
            <View style={styles.shareDateFields}>
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
            {!shareRangeValid ? (
              <Text accessibilityRole="alert" style={styles.errorMessage}>
                {t(
                  getFreeSlotsShareRangeError(shareStartDate, shareEndDate) ===
                    "too_long"
                    ? "mobile.freeSlotsShareRangeTooLong"
                    : "mobile.freeSlotsShareInvalidRange",
                )}
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
                active={shareFormat === "image"}
                label={t("mobile.freeSlotsShareGraphicFormat")}
                onPress={() => {
                  setShareFormat("image");
                  setShareStatus("idle");
                }}
              />
            </View>
            <Text style={styles.sectionTitle}>
              {t("mobile.freeSlotsSharePreview")}
            </Text>
          </>
        ) : null}
        {activeMode === "book" ? (
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
        ) : null}
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
        ) : activeMode === "share" && shareFormat === "image" ? (
          <FreeSlotsShareCard
            days={shareCardDays}
            locale={locale}
            periodLabel={periodLabel}
            ref={shareCardRef}
            title={t("mobile.freeSlotsShareGraphicTitle")}
            workspaceName={workspace.name}
          />
        ) : activeMode === "share" ? (
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
            <Text style={styles.shareNote}>
              {t("mobile.freeSlotsShareAvailabilityNote")}
            </Text>
          </View>
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

async function createShareImageFile(imageUri: string) {
  const response = await fetch(imageUri);
  const image = await response.blob();
  return new File([image], "free-appointment-times.png", {
    type: "image/png",
  });
}

function downloadShareImage(image: File) {
  const imageUrl = URL.createObjectURL(image);
  const webDocument = (
    globalThis as typeof globalThis & { document?: WebDownloadDocument }
  ).document;
  if (!webDocument) throw new Error("File download is unavailable");
  const link = webDocument.createElement("a");
  link.download = image.name;
  link.href = imageUrl;
  link.click();
  globalThis.setTimeout(() => URL.revokeObjectURL(imageUrl), 1_000);
}

type WebShareNavigator = {
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files: File[]; title: string }) => Promise<void>;
};

type WebDownloadDocument = {
  createElement: (tag: "a") => {
    click: () => void;
    download: string;
    href: string;
  };
};
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
  shareSchedule: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.surface,
    borderWidth: 1,
    overflow: "hidden",
  },
  shareDateFields: { gap: 12 },
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
  shareNote: {
    ...typography.caption,
    color: colors.secondaryText,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
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
