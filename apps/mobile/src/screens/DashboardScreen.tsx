import { createTranslator, type SupportedLocale } from "@schedule-app/i18n";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BottomNavigation,
  type MobileTab,
} from "../components/BottomNavigation";
import { FloatingBookingAction } from "../components/FloatingBookingAction";
import { NewBookingNotice } from "../components/NewBookingNotice";
import { mobileEnv } from "../config/env";
import type { DemoData } from "../demo/types";
import { colors } from "../theme/tokens";
import type { Service, Workspace } from "../types";
import { buildBookingUrl } from "../utils/bookingUrl";
import { CalendarTab } from "./dashboard/CalendarTab";
import { ProfileTab } from "./dashboard/ProfileTab";
import { TodayTab } from "./dashboard/TodayTab";

type DashboardScreenProps = {
  readonly locale: SupportedLocale;
  readonly onLocaleChange: (locale: SupportedLocale) => void;
  readonly onSignOut: () => void;
  readonly service: Service | null;
  readonly demoData?: DemoData;
  readonly workspace: Workspace;
};

export function DashboardScreen({
  locale,
  onLocaleChange,
  onSignOut,
  service,
  demoData,
  workspace,
}: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("today");
  const [isNewBookingNoticeVisible, setNewBookingNoticeVisible] =
    useState(false);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const navigationLabels = {
    calendar: t("mobile.calendar"),
    profile: t("mobile.profile"),
    today: t("mobile.today"),
  };

  const bookingUrl = buildBookingUrl(mobileEnv.bookingWebUrl, workspace.slug);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "today" && (
          <TodayTab
            locale={locale}
            service={service}
            demoData={demoData}
            t={t}
            workspace={workspace}
          />
        )}
        {activeTab === "calendar" && (
          <CalendarTab demoData={demoData} locale={locale} t={t} />
        )}
        {activeTab === "profile" && (
          <ProfileTab
            locale={locale}
            onLocaleChange={onLocaleChange}
            onOpenBookingLink={() => void Linking.openURL(bookingUrl)}
            onSignOut={onSignOut}
            t={t}
            bookingUrl={bookingUrl}
            workspace={workspace}
          />
        )}
      </ScrollView>
      <FloatingBookingAction
        label={t("mobile.newBooking")}
        onPress={() => setNewBookingNoticeVisible(true)}
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
