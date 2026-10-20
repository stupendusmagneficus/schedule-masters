import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  createWorkspaceSettingsDraft,
  saveWorkspaceSettings,
  validateWorkspaceSettings,
  type WorkspaceSettingsDraft,
  type WorkspaceSettingsError,
} from "../features/workspace/workspaceSettings";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Workspace } from "../types";
import { ActionButton } from "./ActionButton";
import { BookingIntervalField } from "./BookingIntervalField";
import { BookingNoticeField } from "./BookingNoticeField";
import { FullscreenModal } from "./FullscreenModal";

type WorkspaceSettingsModalProps = {
  readonly client: SupabaseClient<Database>;
  readonly closeIcon?: "close" | "chevron-left";
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onSaved: (draft: WorkspaceSettingsDraft) => void;
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
  readonly workspace: Workspace;
};

export function WorkspaceSettingsModal({
  client,
  closeIcon = "close",
  locale,
  onClose,
  onSaved,
  t,
  visible,
  workspace,
}: WorkspaceSettingsModalProps) {
  const [draft, setDraft] = useState(() =>
    createWorkspaceSettingsDraft(workspace),
  );
  const [validationError, setValidationError] =
    useState<WorkspaceSettingsError | null>(null);
  const [serverError, setServerError] = useState<MessageKey | null>(null);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(createWorkspaceSettingsDraft(workspace));
    setValidationError(null);
    setServerError(null);
  }, [visible, workspace]);

  async function handleSave() {
    const error = validateWorkspaceSettings(draft);
    setValidationError(error);
    setServerError(null);
    if (error) return;

    setSaving(true);
    try {
      await saveWorkspaceSettings(client, workspace.id, draft);
      onSaved({ ...draft, name: draft.name.trim(), slug: draft.slug.trim() });
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setServerError(
        message.includes("slug is already taken")
          ? "workspace.settingsSlugTaken"
          : "workspace.settingsSaveFailed",
      );
    } finally {
      setSaving(false);
    }
  }

  function change<K extends keyof WorkspaceSettingsDraft>(
    key: K,
    value: WorkspaceSettingsDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setValidationError(null);
    setServerError(null);
  }

  return (
    <FullscreenModal
      closeDisabled={isSaving}
      closeLabel={t(
        closeIcon === "chevron-left" ? "common.back" : "common.cancel",
      )}
      closeIcon={closeIcon}
      onClose={onClose}
      title={t("workspace.settingsTitle")}
      visible={visible}
      footer={
        <View style={styles.footer}>
          {validationError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t(validationMessageKey(validationError))}
            </Text>
          ) : null}
          {serverError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {t(serverError)}
            </Text>
          ) : null}
          <ActionButton
            disabled={isSaving}
            label={t("workspace.settingsSave")}
            loading={isSaving}
            loadingLabel={t("workspace.settingsSaving")}
            onPress={() => void handleSave()}
            variant="primary"
          />
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.description}>
          {t("workspace.settingsDescription")}
        </Text>
        <Field
          autoCapitalize="words"
          label={t("workspace.settingsName")}
          onChangeText={(value) => change("name", value)}
          value={draft.name}
        />
        <Field
          autoCapitalize="none"
          autoCorrect={false}
          label={t("workspace.settingsSlug")}
          onChangeText={(value) =>
            change("slug", value.toLowerCase().replace(/\s+/g, "-"))
          }
          value={draft.slug}
        />
        {draft.slug.trim() !== workspace.slug ? (
          <Text style={styles.description}>
            {t("workspace.settingsSlugHint")}
          </Text>
        ) : null}
        <BookingIntervalField
          label={t("workspace.bookingIntervalLabel")}
          locale={locale}
          onChange={(bookingIntervalMinutes) =>
            change("bookingIntervalMinutes", bookingIntervalMinutes)
          }
          t={t}
          value={draft.bookingIntervalMinutes}
        />
        <BookingNoticeField
          onChange={(publicBookingMinNoticeMinutes) =>
            change(
              "publicBookingMinNoticeMinutes",
              publicBookingMinNoticeMinutes,
            )
          }
          t={t}
          value={draft.publicBookingMinNoticeMinutes}
        />
      </ScrollView>
    </FullscreenModal>
  );
}

function Field({
  autoCapitalize,
  autoCorrect,
  label,
  onChangeText,
  value,
}: {
  readonly autoCapitalize: "none" | "words";
  readonly autoCorrect?: boolean;
  readonly label: string;
  readonly onChangeText: (value: string) => void;
  readonly value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onChangeText={onChangeText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function validationMessageKey(error: WorkspaceSettingsError): MessageKey {
  const keys: Record<WorkspaceSettingsError, MessageKey> = {
    bookingInterval: "workspace.bookingIntervalInvalid",
    bookingNotice: "workspace.bookingNoticeInvalid",
    name: "workspace.settingsNameInvalid",
    slug: "workspace.setupInvalidSlug",
  };
  return keys[error];
}

const styles = StyleSheet.create({
  content: { gap: 20, padding: 20, paddingBottom: 32 },
  description: { ...typography.body, color: colors.secondaryText },
  error: { ...typography.caption, color: colors.danger },
  field: { gap: 8 },
  footer: { gap: 8 },
  input: {
    ...typography.body,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.primaryText,
    height: 48,
    paddingHorizontal: 14,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  label: { ...typography.label, color: colors.primaryText },
});
