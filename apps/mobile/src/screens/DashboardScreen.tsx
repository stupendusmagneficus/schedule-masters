import { createTranslator, type SupportedLocale } from "@schedule-app/i18n";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BottomNavigation,
  type MobileTab,
} from "../components/BottomNavigation";
import { FloatingBookingAction } from "../components/FloatingBookingAction";
import { colors } from "../theme/tokens";
import type { Service, Workspace } from "../types";
import { CalendarTab } from "./dashboard/CalendarTab";
import { ProfileTab } from "./dashboard/ProfileTab";
import { TodayTab } from "./dashboard/TodayTab";

type DashboardScreenProps = {
  readonly locale: SupportedLocale;
  readonly onLocaleChange: (locale: SupportedLocale) => void;
  readonly onSignOut: () => void;
  readonly service: Service | null;
  readonly workspace: Workspace;
};

export function DashboardScreen({
  locale,
  onLocaleChange,
  onSignOut,
  service,
  workspace,
}: DashboardScreenProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("today");
  const t = useMemo(() => createTranslator(locale), [locale]);
  const navigationLabels = {
    calendar: t("mobile.calendar"),
    profile: t("mobile.profile"),
    today: t("mobile.today"),
  };

  function showNewBookingNotice() {
    Alert.alert(
      t("mobile.newBookingNoticeTitle"),
      t("mobile.newBookingNoticeDescription"),
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "today" && (
          <TodayTab
            locale={locale}
            service={service}
            t={t}
            workspace={workspace}
          />
        )}
        {activeTab === "calendar" && <CalendarTab locale={locale} t={t} />}
        {activeTab === "profile" && (
          <ProfileTab
            locale={locale}
            onLocaleChange={onLocaleChange}
            onSignOut={onSignOut}
            t={t}
            workspace={workspace}
          />
        )}
      </ScrollView>
      <FloatingBookingAction
        label={t("mobile.newBooking")}
        onPress={showNewBookingNotice}
      />
      <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea}>
        <BottomNavigation
          activeTab={activeTab}
          labels={navigationLabels}
          onTabChange={setActiveTab}
        />
      </SafeAreaView>
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
