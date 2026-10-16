import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import type { WorkspaceSettingsDraft } from "../features/workspace/workspaceSettings";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Workspace } from "../types";
import { ActionButton } from "./ActionButton";
import { FullscreenModal } from "./FullscreenModal";
import { InfoCard } from "./InfoCard";
import { LocalePicker } from "./LocalePicker";
import { WorkspaceSettingsModal } from "./WorkspaceSettingsModal";

type SettingsModalProps = {
  readonly bookingUrl: string;
  readonly canManageWorkspace: boolean;
  readonly client: SupabaseClient<Database> | null;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onLocaleChange: (locale: SupportedLocale) => void;
  readonly onOpenBookingLink: () => void;
  readonly onWorkspaceSaved: (draft: WorkspaceSettingsDraft) => void;
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
  readonly workspace: Workspace;
};

export function SettingsModal({
  bookingUrl,
  canManageWorkspace,
  client,
  locale,
  onClose,
  onLocaleChange,
  onOpenBookingLink,
  onWorkspaceSaved,
  t,
  visible,
  workspace,
}: SettingsModalProps) {
  const [isWorkspaceSettingsVisible, setWorkspaceSettingsVisible] =
    useState(false);

  return (
    <>
      <FullscreenModal
        closeLabel={t("common.close")}
        onClose={onClose}
        title={t("mobile.settings")}
        visible={visible}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {canManageWorkspace && client ? (
            <InfoCard>
              <Text style={styles.sectionTitle}>
                {t("workspace.settingsTitle")}
              </Text>
              <Text style={styles.helper}>
                {t("workspace.settingsDescription")}
              </Text>
              <ActionButton
                label={t("workspace.settingsEdit")}
                onPress={() => setWorkspaceSettingsVisible(true)}
                style={styles.action}
                variant="secondary"
              />
            </InfoCard>
          ) : null}
          <InfoCard>
            <Text style={styles.sectionTitle}>{t("common.language")}</Text>
            <LocalePicker locale={locale} onLocaleChange={onLocaleChange} />
          </InfoCard>
          <InfoCard>
            <Text style={styles.sectionTitle}>
              {t("mobile.publicBookingLink")}
            </Text>
            <Pressable
              accessibilityLabel={bookingUrl}
              accessibilityRole="link"
              onPress={onOpenBookingLink}
              style={styles.bookingLink}
            >
              <Text selectable style={styles.link}>
                {bookingUrl}
              </Text>
            </Pressable>
            <Text style={styles.helper}>
              {t("mobile.publicBookingDescription")}
            </Text>
          </InfoCard>
        </ScrollView>
      </FullscreenModal>
      {canManageWorkspace && client ? (
        <WorkspaceSettingsModal
          client={client}
          closeIcon="chevron-left"
          locale={locale}
          onClose={() => setWorkspaceSettingsVisible(false)}
          onSaved={onWorkspaceSaved}
          t={t}
          visible={isWorkspaceSettingsVisible}
          workspace={workspace}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: 16 },
  bookingLink: { marginBottom: 8, minHeight: 44, justifyContent: "center" },
  content: { gap: 16, padding: 16, paddingBottom: 32 },
  helper: { ...typography.body, color: colors.secondaryText },
  link: { ...typography.label, color: colors.accent, fontWeight: "700" },
  sectionTitle: {
    color: colors.primaryText,
    marginBottom: 12,
    ...typography.section,
  },
});
