import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { Database } from "@schedule-app/api";
import { formatDuration } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { DashboardPageHeader } from "../../components/DashboardPageHeader";
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
  const [isWorkspaceSettingsVisible, setWorkspaceSettingsVisible] =
    useState(false);

  return (
    <View style={styles.content}>
      <DashboardPageHeader
        subtitle={workspace.name}
        title={t("mobile.profile")}
      />
      <InfoCard style={styles.workspaceCard}>
        <View style={styles.cardHeading}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              color={colors.accent}
              name="storefront-outline"
              size={22}
            />
          </View>
          <View style={styles.headingText}>
            <Text style={styles.sectionTitle}>{workspace.name}</Text>
            <Text style={styles.helper}>
              {t("mobile.profileWorkingDays").replace(
                "{count}",
                String(workspace.availabilityRules.length),
              )}
            </Text>
            <Text style={styles.helper}>
              {t("mobile.profileBookingInterval").replace(
                "{duration}",
                formatDuration(workspace.bookingIntervalMinutes, locale),
              )}
            </Text>
          </View>
        </View>
        {canManageWorkspace && client ? (
          <ActionButton
            label={t("workspace.settingsEdit")}
            onPress={() => setWorkspaceSettingsVisible(true)}
            size="compact"
            variant="secondary"
          />
        ) : null}
      </InfoCard>

      <InfoCard>
        <Text style={styles.sectionTitle}>{t("mobile.publicBookingLink")}</Text>
        <Text selectable style={styles.bookingUrl}>
          {bookingUrl}
        </Text>
        <Text style={styles.helper}>
          {t("mobile.publicBookingDescription")}
        </Text>
        <ActionButton
          label={t("mobile.profileOpenBooking")}
          onPress={onOpenBookingLink}
          size="compact"
          style={styles.cardAction}
          variant="secondary"
        />
      </InfoCard>

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
      {canManageWorkspace && client ? (
        <WorkspaceSettingsModal
          client={client}
          closeIcon="close"
          locale={locale}
          onClose={() => setWorkspaceSettingsVisible(false)}
          onSaved={onWorkspaceSaved}
          t={t}
          visible={isWorkspaceSettingsVisible}
          workspace={workspace}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  workspaceCard: { gap: 16 },
  cardHeading: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  iconCircle: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headingText: { flex: 1, gap: 4 },
  sectionTitle: { ...typography.section, color: colors.primaryText },
  helper: { ...typography.caption, color: colors.secondaryText },
  bookingUrl: {
    ...typography.label,
    color: colors.accent,
    fontWeight: "700",
    marginTop: 4,
  },
  cardAction: { alignSelf: "flex-start", marginTop: 8 },
  signOutError: { ...typography.body, color: colors.danger },
});
