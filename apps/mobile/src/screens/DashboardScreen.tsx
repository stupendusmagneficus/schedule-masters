import type { Database } from "@schedule-app/api";
import { createTranslator, type SupportedLocale } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, ScrollView, Share, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionFeedback } from "../components/ActionFeedback";
import { AppointmentDetailsModal } from "../components/AppointmentDetailsModal";
import { BookingRequestsModal } from "../components/BookingRequestsModal";
import {
  BottomNavigation,
  type MobileTab,
} from "../components/BottomNavigation";
import { FloatingBookingAction } from "../components/FloatingBookingAction";
import { FreeSlotsModal } from "../components/FreeSlotsModal";
import { ManualBookingModal } from "../components/ManualBookingModal";
import { NewBookingNotice } from "../components/NewBookingNotice";
import { WaitingListMatchesModal } from "../components/WaitingListMatchesModal";
import { WaitingListModal } from "../components/WaitingListModal";
import { mobileEnv } from "../config/env";
import type { DemoData } from "../demo/types";
import {
  type AppointmentStatus,
  cancelMasterAppointmentSeriesFuture,
  type MasterAppointment,
  setMasterAppointmentNote,
  setMasterAppointmentPaidAmount,
  setMasterAppointmentStatus,
} from "../features/appointments/manualBooking";
import { formatDateInTimeZone } from "../features/availability/personalBlocks";
import { useBookingRequests } from "../features/bookingRequests/useBookingRequests";
import { useCalendarData } from "../features/calendar/useCalendarData";
import { useCalendarMonthWindow } from "../features/calendar/useCalendarMonthWindow";
import { buildCustomerPhoneUrl } from "../features/customers/customerContact";
import type { CustomerProfile } from "../features/customers/customerDirectory";
import { useCustomerPhone } from "../features/customers/useCustomerPhone";
import {
  createCustomerAppointmentLink,
  recordCustomerLinkShare,
} from "../features/notifications/customerAppointmentLink";
import { useServiceCatalog } from "../features/services/useServiceCatalog";
import { useWaitingList } from "../features/waitingList/useWaitingList";
import {
  listMasterWaitingListMatches,
  type MasterWaitingListMatch,
  moveBookingRequestToWaitingList,
  setMasterWaitingListEntryStatus,
} from "../features/waitingList/waitingList";
import { analytics, analyticsEvents } from "../lib/analytics";
import { spacing } from "../theme/spacing";
import { colors } from "../theme/tokens";
import type { Service, Workspace } from "../types";
import {
  buildAppointmentManagementUrl,
  buildBookingUrl,
} from "../utils/bookingUrl";
import { CalendarTab } from "./dashboard/CalendarTab";
import { CustomersTab } from "./dashboard/CustomersTab";
import { FinancesTab } from "./dashboard/FinancesTab";
import { ProfileTab } from "./dashboard/ProfileTab";
import { TodayTab } from "./dashboard/TodayTab";

type DashboardScreenProps = {
  readonly client: SupabaseClient<Database> | null;
  readonly isSigningOut: boolean;
  readonly locale: SupportedLocale;
  readonly onLocaleChange: (locale: SupportedLocale) => void;
  readonly onSignOut: () => void;
  readonly signOutFailed: boolean;
  readonly demoData?: DemoData;
  readonly canManageServices: boolean;
  readonly canManageWorkspace: boolean;
  readonly onWorkspaceSaved: () => void;
  readonly services: readonly Service[];
  readonly workspace: Workspace;
};

export function DashboardScreen({
  client,
  isSigningOut,
  locale,
  onLocaleChange,
  onSignOut,
  signOutFailed,
  demoData,
  canManageServices,
  canManageWorkspace,
  onWorkspaceSaved,
  services,
  workspace,
}: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("today");
  const [financeRefreshVersion, setFinanceRefreshVersion] = useState(0);
  const [customerHistoryRefreshVersion, setCustomerHistoryRefreshVersion] =
    useState(0);
  const [isNewBookingNoticeVisible, setNewBookingNoticeVisible] =
    useState(false);
  const [isFreeSlotsVisible, setFreeSlotsVisible] = useState(false);
  const [isBookingRequestsVisible, setBookingRequestsVisible] = useState(false);
  const [isWaitingListVisible, setWaitingListVisible] = useState(false);
  const [waitingListMatchesVisible, setWaitingListMatchesVisible] =
    useState(false);
  const [waitingListMatches, setWaitingListMatches] = useState<
    MasterWaitingListMatch[]
  >([]);
  const [waitingListMatchesLoading, setWaitingListMatchesLoading] =
    useState(false);
  const [waitingListMatchesError, setWaitingListMatchesError] = useState(false);
  const [waitingListMatchTargetId, setWaitingListMatchTargetId] = useState<
    string | null
  >(null);
  const [selectedWaitingListMatch, setSelectedWaitingListMatch] =
    useState<MasterWaitingListMatch | null>(null);
  const [manualBookingServiceId, setManualBookingServiceId] = useState<
    string | null
  >(null);
  const [manualBookingCustomer, setManualBookingCustomer] = useState<
    | (Pick<CustomerProfile, "email" | "name" | "phone"> & {
        id: string | null;
      })
    | null
  >(null);
  const [pendingBooking, setPendingBooking] = useState<{
    date: string;
    serviceId: string;
    startsAt: string;
  } | null>(null);
  const [isManualBookingVisible, setManualBookingVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<MasterAppointment | null>(null);
  const [manualBookingDate, setManualBookingDate] = useState<string | null>(
    null,
  );
  const [manualBookingStartAt, setManualBookingStartAt] = useState<
    string | null
  >(null);
  const [isUpdatingAppointment, setUpdatingAppointment] = useState(false);
  const [appointmentActionError, setAppointmentActionError] = useState(false);
  const [bookingRequestActionError, setBookingRequestActionError] =
    useState(false);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const dismissFeedback = useCallback(() => setFeedback(null), []);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const calendar = useCalendarData({
    client,
    timezone: workspace.timezone,
    workspaceId: workspace.id,
  });
  const calendarMonthWindow = useCalendarMonthWindow({
    client,
    enabled: activeTab === "calendar" && calendar.view === "month",
    selectedDate: calendar.selectedDate,
    timezone: workspace.timezone,
    workspaceId: workspace.id,
  });
  const bookingRequests = useBookingRequests({
    client,
    enabled: activeTab === "today" && !demoData,
    workspaceId: workspace.id,
  });
  const waitingList = useWaitingList({
    client,
    enabled: activeTab === "today" && !demoData,
    workspaceId: workspace.id,
  });
  const isFullscreenMonthCalendar =
    activeTab === "calendar" && calendar.view === "month";
  const customerPhone = useCustomerPhone({
    client,
    customerId: selectedAppointment?.customer_id ?? null,
    workspaceId: workspace.id,
  });
  const serviceCatalog = useServiceCatalog({
    client,
    initialServices: demoData ? [demoData.primaryService] : services,
    workspaceId: workspace.id,
  });
  const bookingServices = useMemo(
    () =>
      demoData ? [demoData.primaryService] : serviceCatalog.activeServices,
    [demoData, serviceCatalog.activeServices],
  );
  const navigationLabels = {
    calendar: t("mobile.calendar"),
    customers: t("mobile.customers"),
    finances: t("mobile.finances"),
    profile: t("mobile.profile"),
    today: t("mobile.today"),
  };

  function changeTab(tab: MobileTab) {
    if (tab === "today") calendar.goToTodayDay();
    setActiveTab(tab);
  }

  const bookingUrl = buildBookingUrl(mobileEnv.bookingWebUrl, workspace.slug);

  async function updateAppointmentStatus(status: AppointmentStatus) {
    if (!client || !selectedAppointment) return;

    setUpdatingAppointment(true);
    setAppointmentActionError(false);
    try {
      await setMasterAppointmentStatus(client, selectedAppointment.id, status);
      setFinanceRefreshVersion((version) => version + 1);
      await Promise.all([calendar.reload(), bookingRequests.reload()]);
      if (status === "completed") {
        setSelectedAppointment({ ...selectedAppointment, status });
      } else if (
        status === "cancelled_by_master" ||
        status === "cancelled_by_customer"
      ) {
        setSelectedAppointment(null);
        await loadWaitingListMatches(selectedAppointment.id);
      } else {
        setSelectedAppointment(null);
        setFeedback(t("mobile.appointmentStatusUpdated"));
      }
    } catch {
      setAppointmentActionError(true);
    } finally {
      setUpdatingAppointment(false);
    }
  }

  async function loadWaitingListMatches(cancelledAppointmentId: string) {
    if (!client) return;
    setWaitingListMatchTargetId(cancelledAppointmentId);
    setWaitingListMatchesLoading(true);
    setWaitingListMatchesError(false);
    setWaitingListMatchesVisible(true);
    try {
      setWaitingListMatches(
        await listMasterWaitingListMatches(
          client,
          workspace.id,
          cancelledAppointmentId,
        ),
      );
    } catch {
      setWaitingListMatchesError(true);
      setWaitingListMatches([]);
    } finally {
      setWaitingListMatchesLoading(false);
    }
  }

  async function respondToBookingRequest(
    appointmentId: string,
    status: AppointmentStatus,
  ): Promise<boolean> {
    if (!client) return false;
    setSavingRequestId(appointmentId);
    setBookingRequestActionError(false);
    try {
      const result = await setMasterAppointmentStatus(
        client,
        appointmentId,
        status,
      );
      setFinanceRefreshVersion((version) => version + 1);
      await Promise.all([calendar.reload(), bookingRequests.reload()]);
      if (
        status === "cancelled_by_master" ||
        status === "cancelled_by_customer"
      ) {
        setBookingRequestsVisible(false);
        await loadWaitingListMatches(appointmentId);
      }
      setFeedback(
        result.notificationStatus === "not_configured"
          ? t("mobile.bookingRequestEmailNotConfigured")
          : t("mobile.bookingRequestUpdated"),
      );
      return true;
    } catch {
      setBookingRequestActionError(true);
      await bookingRequests.reload();
      return false;
    } finally {
      setSavingRequestId(null);
    }
  }

  async function moveBookingRequestIntoWaitingList(
    appointmentId: string,
  ): Promise<boolean> {
    if (!client) return false;
    setSavingRequestId(appointmentId);
    setBookingRequestActionError(false);
    try {
      await moveBookingRequestToWaitingList(
        client,
        workspace.id,
        appointmentId,
      );
      await Promise.all([bookingRequests.reload(), waitingList.reload()]);
      setFeedback(t("mobile.bookingRequestMovedToWaitingList"));
      return true;
    } catch {
      setBookingRequestActionError(true);
      await bookingRequests.reload();
      return false;
    } finally {
      setSavingRequestId(null);
    }
  }

  async function saveAppointmentPayment(amount: number): Promise<boolean> {
    if (!client || !selectedAppointment) return false;
    setUpdatingAppointment(true);
    setAppointmentActionError(false);
    try {
      await setMasterAppointmentPaidAmount(
        client,
        selectedAppointment.id,
        amount,
      );
      setFinanceRefreshVersion((version) => version + 1);
      await calendar.reload();
      setSelectedAppointment(null);
      setFeedback(t("mobile.paymentSaved"));
      return true;
    } catch {
      return false;
    } finally {
      setUpdatingAppointment(false);
    }
  }

  async function saveAppointmentNote(note: string): Promise<boolean> {
    if (!client || !selectedAppointment) return false;
    setUpdatingAppointment(true);
    try {
      const masterNote = await setMasterAppointmentNote(
        client,
        workspace.id,
        selectedAppointment.id,
        note,
      );
      setSelectedAppointment({
        ...selectedAppointment,
        master_note: masterNote,
      });
      setCustomerHistoryRefreshVersion((version) => version + 1);
      await calendar.reload();
      return true;
    } catch {
      return false;
    } finally {
      setUpdatingAppointment(false);
    }
  }

  async function cancelFutureSeriesAppointments(): Promise<boolean> {
    if (!client || !selectedAppointment?.appointment_series_id) return false;
    setUpdatingAppointment(true);
    try {
      const cancelledCount = await cancelMasterAppointmentSeriesFuture(
        client,
        workspace.id,
        selectedAppointment.id,
      );
      await calendar.reload();
      setSelectedAppointment(null);
      setFeedback(`${t("mobile.recurringCancelled")} (${cancelledCount})`);
      return true;
    } catch {
      return false;
    } finally {
      setUpdatingAppointment(false);
    }
  }

  async function openCustomerPhoneAction(action: "call" | "sms") {
    const url = customerPhone.phone
      ? buildCustomerPhoneUrl(customerPhone.phone, action)
      : null;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      setFeedback(t("mobile.customerContactActionFailed"));
    }
  }

  async function shareAppointmentLink(consentConfirmed: boolean) {
    if (!client || !selectedAppointment) return false;

    setUpdatingAppointment(true);
    try {
      const { token } = await createCustomerAppointmentLink(
        client,
        selectedAppointment.id,
        consentConfirmed,
      );
      const url = buildAppointmentManagementUrl(mobileEnv.bookingWebUrl, token);
      try {
        await Share.share({
          message: url,
          title: t("mobile.shareAppointment"),
          url,
        });
      } catch {
        await recordCustomerLinkShare(
          client,
          selectedAppointment.id,
          "share_sheet_failed",
        );
        return false;
      }
      try {
        await recordCustomerLinkShare(
          client,
          selectedAppointment.id,
          "share_sheet_opened",
        );
      } catch {
        // The sheet result is not delivery confirmation, so keep the truthful UI state.
      }
      return true;
    } catch {
      return false;
    } finally {
      setUpdatingAppointment(false);
    }
  }

  function openManualBooking(
    date?: string,
    startsAt?: string,
    serviceId?: string,
  ) {
    setManualBookingDate(date ?? null);
    setManualBookingStartAt(startsAt ?? null);
    setManualBookingServiceId(serviceId ?? null);
    setManualBookingVisible(true);
  }

  useEffect(() => {
    if (isFreeSlotsVisible || !pendingBooking) return;
    setManualBookingDate(pendingBooking.date);
    setManualBookingStartAt(pendingBooking.startsAt);
    setManualBookingServiceId(pendingBooking.serviceId);
    setManualBookingVisible(true);
    setPendingBooking(null);
  }, [isFreeSlotsVisible, pendingBooking]);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isFullscreenMonthCalendar && styles.monthCalendarContent,
        ]}
        scrollEnabled={!isFullscreenMonthCalendar}
      >
        {activeTab === "today" && (
          <TodayTab
            locale={locale}
            demoData={demoData}
            masterAppointments={calendar.appointments}
            appointmentsError={calendar.error}
            appointmentsLoading={calendar.isLoading}
            appointmentsRefreshing={calendar.isRefreshing}
            bookingRequestCount={
              bookingRequests.error ? null : bookingRequests.requests.length
            }
            bookingRequestsError={Boolean(bookingRequests.error)}
            bookingRequestsLoading={bookingRequests.isLoading}
            waitingListCount={
              (waitingList.error && !waitingList.hasData) ||
              (waitingList.isLoading && waitingList.entries.length === 0)
                ? null
                : waitingList.entries.filter(
                    (entry) => entry.status === "active",
                  ).length
            }
            waitingListError={Boolean(waitingList.error)}
            waitingListLoading={waitingList.isLoading}
            defaultCurrency={bookingServices[0]?.currency ?? "CZK"}
            onGoToToday={calendar.goToTodayDay}
            onNextDay={calendar.goToNext}
            onPreviousDay={calendar.goToPrevious}
            onRetryAppointments={() => void calendar.reload()}
            onOpenBookingRequests={() => {
              setBookingRequestActionError(false);
              setBookingRequestsVisible(true);
            }}
            onOpenWaitingList={() => {
              setWaitingListVisible(true);
            }}
            hasActiveServices={bookingServices.length > 0}
            onOpenFreeSlots={() => setFreeSlotsVisible(true)}
            onSelectAppointment={client ? setSelectedAppointment : undefined}
            selectedDate={calendar.selectedDate}
            t={t}
            workspace={workspace}
          />
        )}
        {activeTab === "calendar" && (
          <CalendarTab
            calendar={calendar}
            monthWindow={calendarMonthWindow}
            client={client}
            demoData={demoData}
            locale={locale}
            onSelectAppointment={client ? setSelectedAppointment : undefined}
            onFeedback={setFeedback}
            onSelectTime={(date, startsAt) =>
              client
                ? openManualBooking(date, startsAt)
                : setNewBookingNoticeVisible(true)
            }
            t={t}
            workspace={workspace}
          />
        )}
        <FinancesTab
          client={client}
          demoData={demoData}
          locale={locale}
          refreshVersion={financeRefreshVersion}
          t={t}
          visible={activeTab === "finances"}
          workspace={workspace}
        />
        <CustomersTab
          client={client}
          historyRefreshVersion={customerHistoryRefreshVersion}
          locale={locale}
          onCreateBooking={(customer) => {
            setManualBookingCustomer(customer);
            openManualBooking();
          }}
          onSelectAppointment={setSelectedAppointment}
          t={t}
          visible={activeTab === "customers"}
          workspace={workspace}
        />
        {activeTab === "profile" && (
          <ProfileTab
            isSigningOut={isSigningOut}
            client={client}
            canManageWorkspace={canManageWorkspace}
            canManageServices={canManageServices}
            locale={locale}
            onLocaleChange={onLocaleChange}
            onOpenBookingLink={() => void Linking.openURL(bookingUrl)}
            onSignOut={onSignOut}
            onWorkspaceSaved={onWorkspaceSaved}
            signOutFailed={signOutFailed}
            serviceCatalog={serviceCatalog}
            t={t}
            bookingUrl={bookingUrl}
            workspace={workspace}
          />
        )}
      </ScrollView>
      <ActionFeedback message={feedback} onDismiss={dismissFeedback} />
      <FloatingBookingAction
        label={t("mobile.newBooking")}
        onPress={() =>
          client ? openManualBooking() : setNewBookingNoticeVisible(true)
        }
      />
      <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea}>
        <BottomNavigation
          activeTab={activeTab}
          labels={navigationLabels}
          onTabChange={changeTab}
        />
      </SafeAreaView>
      <NewBookingNotice
        closeLabel={t("mobile.newBookingNoticeClose")}
        description={t("mobile.newBookingNoticeDescription")}
        onClose={() => setNewBookingNoticeVisible(false)}
        title={t("mobile.newBookingNoticeTitle")}
        visible={isNewBookingNoticeVisible}
      />
      <FreeSlotsModal
        client={client}
        demoData={demoData}
        initialDate={calendar.selectedDate}
        locale={locale}
        onBook={(serviceId, date, startsAt) => {
          setFreeSlotsVisible(false);
          if (client) setPendingBooking({ date, serviceId, startsAt });
          else setNewBookingNoticeVisible(true);
        }}
        onClose={() => setFreeSlotsVisible(false)}
        services={bookingServices}
        t={t}
        visible={isFreeSlotsVisible}
        workspace={workspace}
      />
      {client ? (
        <ManualBookingModal
          client={client}
          initialDate={
            manualBookingDate ??
            formatDateInTimeZone(new Date(), workspace.timezone)
          }
          initialStartsAt={manualBookingStartAt ?? undefined}
          initialServiceId={manualBookingServiceId ?? undefined}
          initialCustomer={manualBookingCustomer ?? undefined}
          locale={locale}
          onClose={() => {
            setManualBookingVisible(false);
            setManualBookingDate(null);
            setManualBookingStartAt(null);
            setManualBookingServiceId(null);
            setManualBookingCustomer(null);
            setSelectedWaitingListMatch(null);
          }}
          onCreated={async (appointmentId) => {
            setFinanceRefreshVersion((version) => version + 1);
            await calendar.reload();
            let waitlistStatusSaved = true;
            if (selectedWaitingListMatch) {
              try {
                await setMasterWaitingListEntryStatus(
                  client,
                  workspace.id,
                  selectedWaitingListMatch.id,
                  "booked",
                  appointmentId,
                );
                await waitingList.reload();
              } catch {
                waitlistStatusSaved = false;
              }
              setSelectedWaitingListMatch(null);
            }
            setFeedback(
              waitlistStatusSaved
                ? t("mobile.manualBookingCreated")
                : t("mobile.waitingListBookingPartialFailure"),
            );
            analytics.track(analyticsEvents.appointmentCreated, {
              source: "master_created",
            });
          }}
          services={bookingServices}
          t={t}
          visible={isManualBookingVisible}
          workspace={workspace}
        />
      ) : null}
      <AppointmentDetailsModal
        key={selectedAppointment?.id ?? "closed"}
        appointment={selectedAppointment}
        error={appointmentActionError ? t("mobile.statusUpdateFailed") : null}
        isSaving={isUpdatingAppointment}
        locale={locale}
        onClose={() => {
          if (!isUpdatingAppointment) {
            setSelectedAppointment(null);
            setAppointmentActionError(false);
          }
        }}
        onStatusChange={updateAppointmentStatus}
        onPaymentSave={saveAppointmentPayment}
        onNoteSave={saveAppointmentNote}
        onCancelFutureSeries={cancelFutureSeriesAppointments}
        customerPhone={customerPhone.phone}
        customerContactLoading={customerPhone.isLoading}
        customerContactError={customerPhone.error}
        onRetryCustomerContact={customerPhone.retry}
        onCallCustomer={() => void openCustomerPhoneAction("call")}
        onTextCustomer={() => void openCustomerPhoneAction("sms")}
        onShare={client ? shareAppointmentLink : undefined}
        t={t}
        timezone={workspace.timezone}
        visible={Boolean(selectedAppointment)}
      />
      <BookingRequestsModal
        actionError={
          bookingRequestActionError
            ? t("mobile.bookingRequestActionFailed")
            : null
        }
        error={bookingRequests.error}
        isLoading={bookingRequests.isLoading}
        locale={locale}
        onClose={() => setBookingRequestsVisible(false)}
        onMoveToWaitingList={moveBookingRequestIntoWaitingList}
        onRespond={respondToBookingRequest}
        onRetry={() => void bookingRequests.reload()}
        requests={bookingRequests.requests}
        savingRequestId={savingRequestId}
        t={t}
        timezone={workspace.timezone}
        visible={isBookingRequestsVisible}
      />
      {client ? (
        <WaitingListModal
          client={client}
          defaultDate={formatDateInTimeZone(new Date(), workspace.timezone)}
          entries={waitingList.entries}
          error={waitingList.error}
          hasData={waitingList.hasData}
          isLoading={waitingList.isLoading}
          locale={locale}
          onClose={() => setWaitingListVisible(false)}
          onReload={() => void waitingList.reload()}
          onSaved={waitingList.reload}
          services={bookingServices}
          t={t}
          visible={isWaitingListVisible}
          workspaceId={workspace.id}
        />
      ) : null}
      <WaitingListMatchesModal
        error={waitingListMatchesError}
        isLoading={waitingListMatchesLoading}
        locale={locale}
        matches={waitingListMatches}
        onBook={(match) => {
          setSelectedWaitingListMatch(match);
          setWaitingListMatchesVisible(false);
          setManualBookingCustomer({
            email: match.customer_email,
            id: match.customer_id,
            name: match.customer_name,
            phone: match.customer_phone,
          });
          openManualBooking(
            match.desired_date,
            match.starts_at,
            match.service_id,
          );
        }}
        onClose={() => setWaitingListMatchesVisible(false)}
        onRetry={() =>
          waitingListMatchTargetId
            ? void loadWaitingListMatches(waitingListMatchTargetId)
            : undefined
        }
        saving={isUpdatingAppointment}
        t={t}
        timezone={workspace.timezone}
        visible={waitingListMatchesVisible}
      />
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bottomSafeArea: {
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.compact,
  },
  content: { gap: spacing.section, padding: spacing.page, paddingBottom: 128 },
  monthCalendarContent: {
    flex: 1,
    gap: 0,
    padding: spacing.page,
    paddingBottom: 88,
  },
  screen: { backgroundColor: colors.canvas, flex: 1 },
});
