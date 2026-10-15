import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DashboardHeaderAction } from "../../components/DashboardHeaderAction";
import { InfoCard } from "../../components/InfoCard";
import { LocalePicker } from "../../components/LocalePicker";
import { ServiceCatalogCard } from "../../components/ServiceCatalogCard";
import { WorkspaceSettingsModal } from "../../components/WorkspaceSettingsModal";
import type { ServiceCatalogController } from "../../features/services/useServiceCatalog";
import type { WorkspaceSettingsDraft } from "../../features/workspace/workspaceSettings";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { Workspace } from "../../types";
import type { DashboardTabProps } from "./types";

type ProfileTabProps = DashboardTabProps & {
  readonly canManageWorkspace: boolean;
  readonly canManageServices: boolean;
  readonly client: SupabaseClient<Database> | null;
  readonly isSigningOut: boolean;
  readonly onLocaleChange: (locale: DashboardTabProps["locale"]) => void;
  readonly onClose: () => void;
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
  onClose,
  onOpenBookingLink,
  onSignOut,
  onWorkspaceSaved,
  bookingUrl,
  signOutFailed,
  serviceCatalog,
  t,
  workspace,
}: ProfileTabProps) {
  const [isWorkspaceSettingsVisible, setWorkspaceSettingsVisible] =
    useState(false);
  return (
    <View style={styles.content}>
      <View style={styles.profileHeading}>
        <DashboardHeaderAction
          accessibilityLabel={t("common.back")}
          icon="chevron-left"
          onPress={onClose}
        />
        <View style={styles.profileHeadingCopy}>
          <Text style={styles.eyebrow}>{t("mobile.profile")}</Text>
          <Text style={styles.title}>{workspace.name}</Text>
          <Text style={styles.helper}>{workspace.timezone}</Text>
        </View>
      </View>
      {canManageWorkspace && client ? (
        <InfoCard>
          <Text style={styles.sectionTitle}>
            {t("workspace.settingsTitle")}
          </Text>
          <Text style={styles.helper}>
            {t("workspace.settingsDescription")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setWorkspaceSettingsVisible(true)}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsButtonText}>
              {t("workspace.settingsEdit")}
            </Text>
          </Pressable>
          <WorkspaceSettingsModal
            client={client}
            locale={locale}
            onClose={() => setWorkspaceSettingsVisible(false)}
            onSaved={onWorkspaceSaved}
            t={t}
            visible={isWorkspaceSettingsVisible}
            workspace={workspace}
          />
        </InfoCard>
      ) : null}
      <ServiceCatalogCard
        controller={serviceCatalog}
        editable={canManageServices}
        locale={locale}
        t={t}
      />
      <InfoCard>
        <Text style={styles.sectionTitle}>{t("common.language")}</Text>
        <LocalePicker locale={locale} onLocaleChange={onLocaleChange} />
      </InfoCard>
      <InfoCard>
        <Text style={styles.sectionTitle}>{t("mobile.publicBookingLink")}</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={bookingUrl}
          onPress={onOpenBookingLink}
        >
          <Text style={styles.link}>{bookingUrl}</Text>
        </Pressable>
        <Text style={styles.helper}>
          {t("mobile.publicBookingDescription")}
        </Text>
      </InfoCard>
      {signOutFailed && (
        <Text accessibilityRole="alert" style={styles.signOutError}>
          {t("auth.signOutFailed")}
        </Text>
      )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  profileHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  profileHeadingCopy: { flex: 1, gap: 2, minWidth: 0 },
  disabledButton: { opacity: 0.6 },
  eyebrow: {
    color: colors.accent,
    marginBottom: 6,
    textTransform: "uppercase",
    ...typography.eyebrow,
  },
  helper: { ...typography.body, color: colors.secondaryText },
  link: {
    color: colors.accent,
    marginBottom: 8,
    ...typography.label,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.primaryText,
    marginBottom: 12,
    ...typography.section,
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  settingsButtonText: {
    ...typography.label,
    color: colors.actionText,
    fontWeight: "700",
  },
  signOutButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  signOutError: { ...typography.body, color: colors.danger },
  signOutText: { ...typography.label, color: colors.danger, fontWeight: "700" },
  title: { ...typography.heading, color: colors.primaryText },
});
