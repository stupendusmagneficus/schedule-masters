import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {
  formatAccessibleDate,
  formatCompactDate,
  formatCurrency,
  formatTime,
  type SupportedLocale,
} from "@schedule-app/i18n";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ActionButton } from "../../components/ActionButton";
import {
  AppointmentStatusBadge,
  getAppointmentStatusLabel,
} from "../../components/AppointmentStatusBadge";
import { DashboardActionCard } from "../../components/DashboardActionCard";
import { DashboardPageHeader } from "../../components/DashboardPageHeader";
import { InfoCard } from "../../components/InfoCard";
import { SummaryMetrics } from "../../components/SummaryMetrics";
import type { DemoAppointment, DemoData } from "../../demo/types";
import type { MasterAppointment } from "../../features/appointments/manualBooking";
import { getTodayCalendarDate } from "../../features/calendar/calendar";
import { sumReceivedRevenueByCurrency } from "../../features/finance/todayRevenue";
import { spacing } from "../../theme/spacing";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import { shouldShowBookingRequests } from "./bookingRequestsVisibility";
import type { DashboardTabProps } from "./types";

type TodayTabProps = DashboardTabProps & {
  readonly demoData?: DemoData;
  readonly masterAppointments?: readonly MasterAppointment[];
  readonly appointmentsError?: string | null;
  readonly appointmentsLoading?: boolean;
  readonly bookingRequestCount: number | null;
  readonly bookingRequestsError: boolean;
  readonly bookingRequestsLoading: boolean;
  readonly waitingListCount: number | null;
  readonly waitingListError: boolean;
  readonly waitingListLoading: boolean;
  readonly defaultCurrency: string;
  readonly onGoToToday: () => void;
  readonly onNextDay: () => void;
  readonly onPreviousDay: () => void;
  readonly onRetryAppointments?: () => void;
  readonly onOpenBookingRequests: () => void;
  readonly onOpenWaitingList: () => void;
  readonly hasActiveServices: boolean;
  readonly onOpenFreeSlots: () => void;
  readonly onSelectAppointment?: (appointment: MasterAppointment) => void;
  readonly selectedDate: string;
  readonly workspace: Workspace;
};

export function TodayTab({
  demoData,
  locale,
  masterAppointments = [],
  appointmentsError = null,
  appointmentsLoading = false,
  onRetryAppointments,
  bookingRequestCount,
  bookingRequestsError,
  bookingRequestsLoading,
  waitingListCount,
  waitingListError,
  waitingListLoading,
  defaultCurrency,
  onGoToToday,
  onNextDay,
  onPreviousDay,
  onOpenBookingRequests,
  onOpenWaitingList,
  onOpenFreeSlots,
  onSelectAppointment,
  hasActiveServices,
  selectedDate,
  t,
  workspace,
}: TodayTabProps) {
  const selectedDateValue = new Date(`${selectedDate}T12:00:00.000Z`);
  const todayDate = getTodayCalendarDate(workspace.timezone);
  const isToday = selectedDate === todayDate;
  const isPastDate = selectedDate < todayDate;
  const showBookingRequests = shouldShowBookingRequests(
    selectedDate,
    todayDate,
  );
  const dateLabel = formatCompactDate(selectedDateValue, locale, {
    timeZone: workspace.timezone,
  });
  const demoAppointments = isToday ? (demoData?.appointments ?? []) : [];
  const visibleAppointments = masterAppointments.filter(
    (appointment) =>
      appointment.status !== "cancelled_by_customer" &&
      appointment.status !== "cancelled_by_master",
  );
  const activeAppointments = masterAppointments.filter(
    (appointment) =>
      appointment.status === "pending" || appointment.status === "confirmed",
  );
  const receivedRevenueByCurrency = demoData
    ? {}
    : sumReceivedRevenueByCurrency(masterAppointments);
  const receivedRevenue = formatReceivedRevenue(
    receivedRevenueByCurrency,
    locale,
    defaultCurrency,
  );
  const appointmentCount = demoData
    ? demoAppointments.length
    : visibleAppointments.length;
  const nextLiveAppointment = activeAppointments[0];

  return (
    <View style={styles.content}>
      <DashboardPageHeader
        centeredTitle
        leadingAction={{
          accessibilityLabel: t("mobile.calendarPrevious"),
          icon: "arrow-left",
          onPress: onPreviousDay,
        }}
        subtitle={isToday ? dateLabel : undefined}
        subtitleAccessibilityLabel={
          isToday
            ? formatAccessibleDate(
                selectedDateValue,
                locale,
                workspace.timezone,
              )
            : undefined
        }
        subtitleAction={
          isToday
            ? undefined
            : {
                accessibilityLabel: t("mobile.today"),
                label: t("mobile.today"),
                onPress: onGoToToday,
              }
        }
        title={isToday ? t("mobile.today") : dateLabel}
        trailingAction={{
          accessibilityLabel: t("mobile.calendarNext"),
          icon: "arrow-right",
          onPress: onNextDay,
        }}
      />
      {demoData ? (
        <Text style={styles.demoLabel}>{t("mobile.demoMode")}</Text>
      ) : null}

      {demoData && (
        <InfoCard style={styles.scheduleCard}>
          <ScheduleSectionHeader
            onOpenFreeSlots={onOpenFreeSlots}
            showFreeSlots={Boolean(hasActiveServices || demoData)}
            title={
              isToday ? t("mobile.todaySchedule") : t("mobile.daySchedule")
            }
            t={t}
          />
          {demoAppointments.length ? (
            <View style={styles.appointmentsList}>
              {demoAppointments.map((appointment, index) => (
                <AppointmentRow
                  appointment={appointment}
                  isNextBooking={index === 0}
                  key={appointment.id}
                  t={t}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>
              {isToday
                ? t("mobile.noBookingsToday")
                : t("mobile.noBookingsOnDay")}
            </Text>
          )}
        </InfoCard>
      )}

      {!demoData ? (
        <InfoCard style={styles.scheduleCard}>
          <ScheduleSectionHeader
            onOpenFreeSlots={onOpenFreeSlots}
            showFreeSlots={Boolean(hasActiveServices)}
            title={
              isToday ? t("mobile.todaySchedule") : t("mobile.daySchedule")
            }
            t={t}
          />
          {appointmentsLoading ? (
            <View accessibilityLiveRegion="polite" style={styles.state}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.helper}>{t("common.loading")}</Text>
            </View>
          ) : appointmentsError ? (
            <View style={styles.retryState}>
              <Text style={styles.error}>{t("mobile.todayLoadFailed")}</Text>
              <ActionButton
                label={t("mobile.todayRetry")}
                onPress={() => onRetryAppointments?.()}
                size="compact"
                style={styles.retryButton}
                variant="quiet"
              />
            </View>
          ) : masterAppointments.length ? (
            <View style={styles.appointmentsList}>
              {masterAppointments.map((appointment) => (
                <MasterAppointmentRow
                  appointment={appointment}
                  isNextBooking={appointment.id === nextLiveAppointment?.id}
                  key={appointment.id}
                  locale={locale}
                  onPress={() => onSelectAppointment?.(appointment)}
                  t={t}
                  timezone={workspace.timezone}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>
              {isToday
                ? t("mobile.noBookingsToday")
                : t("mobile.noBookingsOnDay")}
            </Text>
          )}
        </InfoCard>
      ) : null}

      {!demoData && showBookingRequests ? (
        <DashboardActionCard
          accessibilityLabel={
            bookingRequestCount === null
              ? t("mobile.bookingRequests")
              : `${t("mobile.bookingRequests")}: ${bookingRequestCount}`
          }
          description={
            bookingRequestsError ? (
              <View style={styles.requestError}>
                <MaterialCommunityIcons
                  accessibilityElementsHidden
                  color={colors.danger}
                  name="alert-circle-outline"
                  size={20}
                />
                <Text style={styles.requestErrorText}>
                  {waitingListCount === null
                    ? t("common.error")
                    : t("mobile.waitingListStale")}
                </Text>
              </View>
            ) : undefined
          }
          onPress={onOpenBookingRequests}
          title={t("mobile.bookingRequests")}
          trailing={
            bookingRequestsLoading && bookingRequestCount === null ? (
              <ActivityIndicator color={colors.accent} />
            ) : bookingRequestsError ? null : bookingRequestCount !== null ? (
              <View style={styles.requestCount}>
                <Text style={styles.requestCountText}>
                  {bookingRequestCount}
                </Text>
              </View>
            ) : null
          }
        />
      ) : null}

      {(!appointmentsLoading && !appointmentsError) || demoData ? (
        <SummaryMetrics
          metrics={[
            {
              id: "bookings",
              label: t("mobile.bookings"),
              value: String(appointmentCount),
            },
            {
              id: "received-revenue",
              label: t("mobile.receivedRevenue"),
              tone: "accent",
              value: receivedRevenue,
            },
          ]}
        />
      ) : null}

      {!demoData && !isPastDate ? (
        <DashboardActionCard
          accessibilityLabel={
            waitingListCount === null
              ? t("mobile.waitingList")
              : `${t("mobile.waitingList")}: ${waitingListCount}`
          }
          description={
            waitingListError ? (
              <View style={styles.requestError}>
                <MaterialCommunityIcons
                  accessibilityElementsHidden
                  color={colors.danger}
                  name="alert-circle-outline"
                  size={20}
                />
                <Text style={styles.requestErrorText}>{t("common.error")}</Text>
              </View>
            ) : undefined
          }
          onPress={onOpenWaitingList}
          title={t("mobile.waitingList")}
          trailing={
            waitingListLoading && waitingListCount === null ? (
              <ActivityIndicator color={colors.accent} />
            ) : waitingListCount !== null ? (
              <View style={styles.requestCount}>
                <Text style={styles.requestCountText}>{waitingListCount}</Text>
              </View>
            ) : null
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.section },
  demoLabel: {
    ...typography.caption,
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    color: colors.secondaryText,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  helper: { ...typography.body, color: colors.secondaryText },
  error: { ...typography.body, color: colors.danger },
  retryButton: { alignSelf: "flex-start", marginLeft: -10, marginTop: -8 },
  retryState: { alignItems: "flex-start", gap: 4 },
  state: { alignItems: "center", flexDirection: "row", gap: 10 },
  nextLabel: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  sectionTitle: { color: colors.primaryText, ...typography.section },
  serviceName: {
    ...typography.body,
    color: colors.primaryText,
    fontWeight: "600",
  },
  appointmentsList: { gap: 12 },
  requestCount: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: 10,
  },
  requestCountText: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
  },
  requestError: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    maxWidth: "100%",
    minWidth: 0,
  },
  requestErrorText: {
    ...typography.caption,
    color: colors.danger,
    flexShrink: 1,
    fontWeight: "700",
    textAlign: "left",
  },
  scheduleCard: { marginTop: 8 },
  scheduleHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.compact,
    justifyContent: "space-between",
    marginBottom: 10,
  },
  freeSlotsAction: { borderRadius: radii.pill, minHeight: 44 },
  appointmentDetails: { flex: 1, gap: 2 },
  appointmentRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "700",
  },
});

function ScheduleSectionHeader({
  onOpenFreeSlots,
  showFreeSlots,
  title,
  t,
}: {
  readonly onOpenFreeSlots: () => void;
  readonly showFreeSlots: boolean;
  readonly title: string;
  readonly t: TodayTabProps["t"];
}) {
  return (
    <View style={styles.scheduleHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {showFreeSlots ? (
        <ActionButton
          icon={
            <MaterialCommunityIcons
              color={colors.accent}
              name="calendar-search"
              size={18}
            />
          }
          label={t("mobile.freeSlots")}
          onPress={onOpenFreeSlots}
          size="compact"
          style={styles.freeSlotsAction}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

function formatReceivedRevenue(
  amounts: Readonly<Record<string, number>>,
  locale: SupportedLocale,
  defaultCurrency: string,
): string {
  const entries = Object.entries(amounts);
  if (entries.length === 0) {
    return formatCurrency(0, locale, defaultCurrency);
  }
  return entries
    .map(([currency, amount]) => formatCurrency(amount, locale, currency))
    .join(" · ");
}

function AppointmentRow({
  appointment,
  isNextBooking = false,
  t,
}: {
  readonly appointment: DemoAppointment;
  readonly isNextBooking?: boolean;
  readonly t: TodayTabProps["t"];
}) {
  const statusLabel =
    appointment.status === "confirmed"
      ? t("mobile.confirmed")
      : t("mobile.pending");

  return (
    <View style={styles.appointmentRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{appointment.initials}</Text>
      </View>
      <View style={styles.appointmentDetails}>
        {isNextBooking ? (
          <Text style={styles.nextLabel}>{t("mobile.nextBooking")}</Text>
        ) : null}
        <Text style={styles.serviceName}>{appointment.clientName}</Text>
        <Text style={styles.helper}>
          {appointment.startsAt} · {appointment.serviceName} ·{" "}
          {appointment.durationMinutes} min
        </Text>
      </View>
      <AppointmentStatusBadge label={statusLabel} status={appointment.status} />
    </View>
  );
}

function MasterAppointmentRow({
  appointment,
  isNextBooking = false,
  locale,
  onPress,
  t,
  timezone,
}: {
  readonly appointment: MasterAppointment;
  readonly isNextBooking?: boolean;
  readonly locale: TodayTabProps["locale"];
  readonly onPress?: () => void;
  readonly t: TodayTabProps["t"];
  readonly timezone: string;
}) {
  const status = appointment.status;
  const statusLabel = getAppointmentStatusLabel(status, t);
  const initials = appointment.customer_name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const content = (
    <View style={styles.appointmentRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.appointmentDetails}>
        {isNextBooking ? (
          <Text style={styles.nextLabel}>{t("mobile.nextBooking")}</Text>
        ) : null}
        <Text style={styles.serviceName}>{appointment.customer_name}</Text>
        <Text style={styles.helper}>
          {formatTime(new Date(appointment.starts_at), locale, {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone,
          })}{" "}
          · {appointment.service_name} · {appointment.duration_minutes} min
        </Text>
      </View>
      <AppointmentStatusBadge label={statusLabel} status={status} />
    </View>
  );

  return onPress ? (
    <Pressable
      accessibilityLabel={`${appointment.customer_name}, ${statusLabel}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}
