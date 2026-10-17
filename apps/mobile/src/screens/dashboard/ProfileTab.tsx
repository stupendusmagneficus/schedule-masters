import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "../../components/ActionButton";
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
      <ActionButton
        disabled={isSigningOut}
        label={t("mobile.signOut")}
        loading={isSigningOut}
        loadingLabel={t("common.loading")}
        onPress={onSignOut}
        variant="destructive"
      />
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
  settingsCard: { padding: 0 },
  settingsEntry: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsTitle: {
    ...typography.section,
    color: colors.primaryText,
    flex: 1,
    fontWeight: "700",
  },
  signOutError: { ...typography.body, color: colors.danger },
});
