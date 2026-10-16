import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DashboardPageHeader } from "../../components/DashboardPageHeader";
import { InfoCard } from "../../components/InfoCard";
import { ServiceCatalogCard } from "../../components/ServiceCatalogCard";
import { SettingsModal } from "../../components/SettingsModal";
import type { ServiceCatalogController } from "../../features/services/useServiceCatalog";
import type { WorkspaceSettingsDraft } from "../../features/workspace/workspaceSettings";
import { colors } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type ProfileTabProps = DashboardTabProps & {
  readonly canManageWorkspace: boolean;
  readonly canManageServices: boolean;
  readonly client: SupabaseClient<Database> | null;
  readonly isSigningOut: boolean;
  readonly onLocaleChange: (locale: DashboardTabProps["locale"]) => void;
  readonly onOpenBookingLink: () => void;
  readonly onSignOut: () => void;
  readonly onWorkspaceSaved: (draft: WorkspaceSettingsDraft) => void;
  readonly bookingUrl: string;
  readonly signOutFailed: boolean;
  readonly serviceCatalog: ServiceCatalogController;
  readonly workspace: Workspace;
};

export function ProfileTab({
  canManageWorkspace,
  canManageServices,
  client,
  isSigningOut,
  locale,
  onLocaleChange,
  onOpenBookingLink,
  onSignOut,
  onWorkspaceSaved,
  bookingUrl,
  signOutFailed,
  serviceCatalog,
  t,
  workspace,
}: ProfileTabProps) {
  const [isSettingsVisible, setSettingsVisible] = useState(false);

  return (
    <View style={styles.content}>
      <DashboardPageHeader
        subtitle={workspace.name}
        title={t("mobile.profile")}
      />
      <InfoCard style={styles.settingsCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("mobile.settings")}
          onPress={() => setSettingsVisible(true)}
          style={styles.settingsEntry}
        >
          <MaterialCommunityIcons
            color={colors.primaryText}
            name="cog"
            size={22}
          />
          <Text style={styles.settingsTitle}>{t("mobile.settings")}</Text>
          <MaterialCommunityIcons
            color={colors.secondaryText}
            name="chevron-right"
            size={24}
          />
        </Pressable>
      </InfoCard>
      <ServiceCatalogCard
        controller={serviceCatalog}
        editable={canManageServices}
        locale={locale}
        t={t}
      />
      {signOutFailed ? (
        <Text accessibilityRole="alert" style={styles.signOutError}>
          {t("auth.signOutFailed")}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSigningOut }}
        disabled={isSigningOut}
        onPress={onSignOut}
        style={[styles.signOutButton, isSigningOut && styles.disabledButton]}
      >
        <Text style={styles.signOutText}>
          {isSigningOut ? t("common.loading") : t("mobile.signOut")}
        </Text>
      </Pressable>
      <SettingsModal
        bookingUrl={bookingUrl}
        canManageWorkspace={canManageWorkspace}
        client={client}
        locale={locale}
        onClose={() => setSettingsVisible(false)}
        onLocaleChange={onLocaleChange}
        onOpenBookingLink={onOpenBookingLink}
        onWorkspaceSaved={onWorkspaceSaved}
        t={t}
        visible={isSettingsVisible}
        workspace={workspace}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  disabledButton: { opacity: 0.6 },
  settingsCard: { padding: 0 },
  settingsEntry: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsTitle: {
    ...typography.section,
    color: colors.primaryText,
    flex: 1,
    fontWeight: "700",
  },
  signOutButton: {
    alignItems: "center",
    borderColor: colors.danger,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  signOutError: { ...typography.body, color: colors.danger },
  signOutText: { ...typography.label, color: colors.danger, fontWeight: "700" },
});
