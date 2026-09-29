import type { Database } from "@schedule-app/api";
import { createTranslator, type SupportedLocale } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppointmentDetailsModal } from "../components/AppointmentDetailsModal";
import {
  BottomNavigation,
  type MobileTab,
} from "../components/BottomNavigation";
import { FloatingBookingAction } from "../components/FloatingBookingAction";
import { ManualBookingModal } from "../components/ManualBookingModal";
import { NewBookingNotice } from "../components/NewBookingNotice";
import { mobileEnv } from "../config/env";
import type { DemoData } from "../demo/types";
import {
  type AppointmentStatus,
  type MasterAppointment,
  setMasterAppointmentStatus,
} from "../features/appointments/manualBooking";
import { useMasterAppointments } from "../features/appointments/useMasterAppointments";
import { formatDateInTimeZone } from "../features/availability/personalBlocks";
import { useCalendarData } from "../features/calendar/useCalendarData";
import { useServiceCatalog } from "../features/services/useServiceCatalog";
import { analytics, analyticsEvents } from "../lib/analytics";
import { colors } from "../theme/tokens";
import type { Service, Workspace } from "../types";
import { buildBookingUrl } from "../utils/bookingUrl";
import { CalendarTab } from "./dashboard/CalendarTab";
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
  services,
  workspace,
}: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("today");
  const [isNewBookingNoticeVisible, setNewBookingNoticeVisible] =
    useState(false);
  const [isManualBookingVisible, setManualBookingVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<MasterAppointment | null>(null);
  const [isUpdatingAppointment, setUpdatingAppointment] = useState(false);
  const [appointmentActionError, setAppointmentActionError] = useState(false);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const { appointments, reload: reloadAppointments } = useMasterAppointments({
    client,
    timezone: workspace.timezone,
    workspaceId: workspace.id,
  });
  const calendar = useCalendarData({
    client,
    timezone: workspace.timezone,
    workspaceId: workspace.id,
  });
  const serviceCatalog = useServiceCatalog({
    client,
    initialServices: demoData ? [demoData.primaryService] : services,
    workspaceId: workspace.id,
  });
  const service = demoData
    ? demoData.primaryService
    : (serviceCatalog.activeServices[0] ?? null);
  const navigationLabels = {
    calendar: t("mobile.calendar"),
    profile: t("mobile.profile"),
    today: t("mobile.today"),
  };

  const bookingUrl = buildBookingUrl(mobileEnv.bookingWebUrl, workspace.slug);

  async function updateAppointmentStatus(status: AppointmentStatus) {
    if (!client || !selectedAppointment) return;

    setUpdatingAppointment(true);
    setAppointmentActionError(false);
    try {
      await setMasterAppointmentStatus(client, selectedAppointment.id, status);
      await reloadAppointments();
      await calendar.reload();
      setSelectedAppointment(null);
    } catch {
      setAppointmentActionError(true);
    } finally {
      setUpdatingAppointment(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "today" && (
          <TodayTab
            locale={locale}
            service={service}
            demoData={demoData}
            masterAppointments={appointments}
            onSelectAppointment={client ? setSelectedAppointment : undefined}
            t={t}
            workspace={workspace}
          />
        )}
        {activeTab === "calendar" && (
          <CalendarTab
            calendar={calendar}
            client={client}
            demoData={demoData}
            locale={locale}
            onSelectAppointment={client ? setSelectedAppointment : undefined}
            t={t}
            workspace={workspace}
          />
        )}
        {activeTab === "profile" && (
          <ProfileTab
            isSigningOut={isSigningOut}
            canManageServices={canManageServices}
            locale={locale}
            onLocaleChange={onLocaleChange}
            onOpenBookingLink={() => void Linking.openURL(bookingUrl)}
            onSignOut={onSignOut}
            signOutFailed={signOutFailed}
            serviceCatalog={serviceCatalog}
            t={t}
            bookingUrl={bookingUrl}
            workspace={workspace}
          />
        )}
      </ScrollView>
      <FloatingBookingAction
        label={t("mobile.newBooking")}
        onPress={() =>
          client
            ? setManualBookingVisible(true)
            : setNewBookingNoticeVisible(true)
        }
      />
      <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea}>
        <BottomNavigation
          activeTab={activeTab}
          labels={navigationLabels}
          onTabChange={setActiveTab}
        />
      </SafeAreaView>
      <NewBookingNotice
        closeLabel={t("mobile.newBookingNoticeClose")}
        description={t("mobile.newBookingNoticeDescription")}
        onClose={() => setNewBookingNoticeVisible(false)}
        title={t("mobile.newBookingNoticeTitle")}
        visible={isNewBookingNoticeVisible}
      />
      {client ? (
        <ManualBookingModal
          client={client}
          initialDate={formatDateInTimeZone(new Date(), workspace.timezone)}
          locale={locale}
          onClose={() => setManualBookingVisible(false)}
          onCreated={async () => {
            await reloadAppointments();
            await calendar.reload();
            analytics.track(analyticsEvents.appointmentCreated, {
              source: "master_created",
            });
          }}
          services={
            demoData ? [demoData.primaryService] : serviceCatalog.activeServices
          }
          t={t}
          visible={isManualBookingVisible}
          workspace={workspace}
        />
      ) : null}
      <AppointmentDetailsModal
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
        t={t}
        timezone={workspace.timezone}
        visible={Boolean(selectedAppointment)}
      />
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bottomSafeArea: {
    backgroundColor: colors.canvas,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  content: { gap: 16, padding: 16, paddingBottom: 128 },
  screen: { backgroundColor: colors.canvas, flex: 1 },
});
