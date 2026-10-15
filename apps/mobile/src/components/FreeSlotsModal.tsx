import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import { formatDate, formatTime } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { DemoData } from "../demo/types";
import {
  listMasterMonthAvailableSlots,
  type MonthAvailableSlot,
} from "../features/appointments/manualBooking";
import {
  buildMonthAvailabilityCalendar,
  getAvailableDates,
} from "../features/appointments/monthAvailability";
import { moveCalendarDate } from "../features/calendar/calendar";
import {
  getDayTimelineSlotStart,
  timeToMinutes,
} from "../features/calendar/dayTimeline";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service, Workspace } from "../types";
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
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [monthDate, setMonthDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [slots, setSlots] = useState<MonthAvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMonthDate(initialDate);
    setSelectedDate(initialDate);
    setSelectedStart(null);
    setServiceId(services[0]?.id ?? "");
  }, [initialDate, services, visible]);

  useEffect(() => {
    if (!visible || !serviceId || demoData || !client) {
      if (!demoData) setSlots([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setHasError(false);
    setSlots([]);
    void listMasterMonthAvailableSlots(
      client,
      workspace.id,
      serviceId,
      monthDate,
    )
      .then((monthSlots) => {
        if (!active) return;
        setSlots(monthSlots);
        setSelectedDate((current) =>
          monthSlots.some((slot) => slot.available_date === current)
            ? current
            : (monthSlots[0]?.available_date ?? `${monthDate.slice(0, 7)}-01`),
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
  }, [client, demoData, monthDate, serviceId, visible, workspace.id]);

  const displaySlots = useMemo(() => {
    if (!demoData) return slots;
    return demoData.freeSlots.map((time): MonthAvailableSlot => {
      const startsAt = getDayTimelineSlotStart(
        selectedDate,
        timeToMinutes(time),
        workspace.timezone,
      );
      return {
        available_date: selectedDate,
        ends_at: new Date(
          new Date(startsAt).getTime() +
            demoData.primaryService.duration_minutes * 60_000,
        ).toISOString(),
        starts_at: startsAt,
      };
    });
  }, [demoData, selectedDate, slots, workspace.timezone]);

  const calendar = useMemo(
    () => buildMonthAvailabilityCalendar(monthDate, displaySlots),
    [displaySlots, monthDate],
  );
  const availableDates = getAvailableDates(calendar.slotsByDate);
  const selectedDaySlots = calendar.slotsByDate.get(selectedDate) ?? [];
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

  return (
    <FullscreenModal
      closeLabel={t("common.cancel")}
      onClose={onClose}
      title={t("mobile.freeSlots")}
      visible={visible}
      footer={
        <Pressable
          accessibilityRole="button"
          disabled={!selectedService || !selectedStart || isLoading}
          onPress={() => {
            if (selectedService && selectedStart) {
              onBook(selectedService.id, selectedDate, selectedStart);
            }
          }}
          style={({ pressed }) => [
            styles.bookButton,
            (!selectedService || !selectedStart || isLoading) &&
              styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.bookButtonText}>{t("mobile.freeSlotsBook")}</Text>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          {t("mobile.freeSlotsDescription")}
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
            }}
            style={styles.monthArrow}
          >
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>
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
        {isLoading ? (
          <View accessibilityLiveRegion="polite" style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.helper}>{t("common.loading")}</Text>
          </View>
        ) : hasError ? (
          <Text accessibilityRole="alert" style={styles.message}>
            {t("mobile.freeSlotsLoadFailed")}
          </Text>
        ) : !availableDates.size ? (
          <Text style={styles.message}>
            {t("mobile.freeSlotsNoAvailability")}
          </Text>
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
  check: { color: colors.accent, fontSize: 18, fontWeight: "700" },
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
