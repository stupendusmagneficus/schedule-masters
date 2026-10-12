import type { SupportedLocale } from "@schedule-app/i18n";
import { formatCurrency, formatTime } from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "../../components/AppointmentStatusBadge";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import {
  type CalendarFeedFilter,
  type CalendarFeedGroup,
  formatCalendarFeedDate,
} from "../../features/calendar/calendarFeed";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { DashboardTabProps } from "./types";

type CalendarFeedProps = {
  readonly filter: CalendarFeedFilter;
  readonly groups: readonly CalendarFeedGroup[];
  readonly locale: SupportedLocale;
  readonly onChangeFilter: (filter: CalendarFeedFilter) => void;
  readonly onPressAppointment?: (appointment: MasterAppointment) => void;
  readonly t: DashboardTabProps["t"];
  readonly timezone: string;
};

export function CalendarFeed({
  filter,
  groups,
  locale,
  onChangeFilter,
  onPressAppointment,
  t,
  timezone,
}: CalendarFeedProps) {
  return (
    <View style={styles.feed}>
      <View accessibilityRole="tablist" style={styles.filterControl}>
        <FilterButton
          active={filter === "all"}
          label={t("mobile.calendarFeedAll")}
          onPress={() => onChangeFilter("all")}
        />
        <FilterButton
          active={filter === "future"}
          label={t("mobile.calendarFeedFuture")}
          onPress={() => onChangeFilter("future")}
        />
      </View>
      {groups.length ? (
        <View accessibilityRole="list" style={styles.groups}>
          {groups.map((group) => (
            <View key={group.date} style={styles.group}>
              <Text style={styles.dateHeading}>
                {formatCalendarFeedDate(group.date, locale)}
              </Text>
              <View style={styles.items}>
                {group.items.map((item) => {
                  const appointment = item.appointment;
                  const block = item.block;
                  const start = formatTime(new Date(item.startsAt), locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: timezone,
                  });
                  const end = formatTime(new Date(item.endsAt), locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: timezone,
                  });

                  if (appointment) {
                    const statusLabel = getAppointmentStatusLabel(
                      appointment.status,
                      t,
                    );
                    const content = (
                      <>
                        <Text style={styles.time}>
                          {start} – {end}
                        </Text>
                        <View style={styles.itemCopy}>
                          <View style={styles.itemHeader}>
                            <Text numberOfLines={1} style={styles.itemTitle}>
                              {appointment.customer_name}
                            </Text>
                            <AppointmentStatusBadge
                              label={statusLabel}
                              status={appointment.status}
                            />
                          </View>
                          <Text numberOfLines={1} style={styles.itemSubtitle}>
                            {appointment.service_name}
                          </Text>
                          <Text style={styles.price}>
                            {formatCurrency(
                              Number(appointment.price_amount),
                              locale,
                              appointment.currency,
                            )}
                          </Text>
                        </View>
                      </>
                    );

                    return onPressAppointment ? (
                      <Pressable
                        accessibilityLabel={`${start} – ${end}, ${appointment.customer_name}, ${appointment.service_name}, ${formatCurrency(Number(appointment.price_amount), locale, appointment.currency)}, ${statusLabel}`}
                        accessibilityRole="button"
                        key={`${item.kind}:${item.id}`}
                        onPress={() => onPressAppointment(appointment)}
                        style={({ pressed }) => [
                          styles.item,
                          styles.bookingItem,
                          pressed && styles.itemPressed,
                        ]}
                      >
                        {content}
                      </Pressable>
                    ) : (
                      <View
                        accessibilityLabel={`${start} – ${end}, ${appointment.customer_name}, ${appointment.service_name}, ${statusLabel}`}
                        key={`${item.kind}:${item.id}`}
                        style={[styles.item, styles.bookingItem]}
                      >
                        {content}
                      </View>
                    );
                  }

                  return (
                    <View
                      accessibilityLabel={`${start} – ${end}, ${block?.reason || t("mobile.personalBlocks")}`}
                      key={`${item.kind}:${item.id}`}
                      style={[styles.item, styles.blockItem]}
                    >
                      <Text style={styles.time}>
                        {start} – {end}
                      </Text>
                      <View style={styles.itemCopy}>
                        <Text numberOfLines={1} style={styles.itemTitle}>
                          {block?.reason || t("mobile.personalBlocks")}
                        </Text>
                        <Text style={styles.itemSubtitle}>
                          {t("mobile.personalBlocks")}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text accessibilityLiveRegion="polite" style={styles.emptyState}>
          {t(
            filter === "future"
              ? "mobile.calendarFeedEmptyFuture"
              : "mobile.calendarFeedEmpty",
          )}
        </Text>
      )}
    </View>
  );
}

function FilterButton({
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
        styles.filterButton,
        active && styles.filterButtonActive,
        pressed && styles.filterButtonPressed,
      ]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  blockItem: {
    backgroundColor: colors.subtleSurface,
    borderLeftColor: colors.secondaryText,
  },
  bookingItem: {
    backgroundColor: colors.accentSoft,
    borderLeftColor: colors.accent,
  },
  dateHeading: {
    ...typography.label,
    color: colors.secondaryText,
  },
  emptyState: {
    ...typography.body,
    color: colors.secondaryText,
    paddingVertical: 18,
    textAlign: "center",
  },
  feed: { gap: 16 },
  filterButton: {
    alignItems: "center",
    borderRadius: radii.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  filterButtonActive: { backgroundColor: colors.surface },
  filterButtonPressed: { opacity: 0.78 },
  filterControl: {
    alignSelf: "flex-start",
    backgroundColor: colors.subtleSurface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  filterText: { ...typography.label, color: colors.secondaryText },
  filterTextActive: { color: colors.primaryText, fontWeight: "700" },
  group: { gap: 8 },
  groups: { gap: 18 },
  item: {
    alignItems: "flex-start",
    borderLeftWidth: 3,
    borderRadius: radii.surface,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  itemCopy: { flex: 1, gap: 3, minWidth: 0 },
  itemHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  itemPressed: { opacity: 0.78 },
  itemSubtitle: { ...typography.caption, color: colors.secondaryText },
  itemTitle: { ...typography.label, color: colors.primaryText, flex: 1 },
  items: { gap: 8 },
  price: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "700",
  },
  time: {
    ...typography.caption,
    color: colors.secondaryText,
    minWidth: 92,
  },
});
