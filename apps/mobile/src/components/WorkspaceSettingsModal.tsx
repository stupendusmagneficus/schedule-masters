import type { Database } from "@schedule-app/api";
import type { MessageKey, SupportedLocale } from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
import { DateTimePickerField } from "./DateTimePickerField";
import { FullscreenModal } from "./FullscreenModal";

type WorkspaceSettingsModalProps = {
  readonly client: SupabaseClient<Database>;
  readonly locale: SupportedLocale;
  readonly onClose: () => void;
  readonly onSaved: (draft: WorkspaceSettingsDraft) => void;
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
  readonly workspace: Workspace;
};

const dayOptions: ReadonlyArray<{
  readonly key: MessageKey;
  readonly value: number;
}> = [
  { key: "workspace.dayMonday", value: 1 },
  { key: "workspace.dayTuesday", value: 2 },
  { key: "workspace.dayWednesday", value: 3 },
  { key: "workspace.dayThursday", value: 4 },
  { key: "workspace.dayFriday", value: 5 },
  { key: "workspace.daySaturday", value: 6 },
  { key: "workspace.daySunday", value: 7 },
];

export function WorkspaceSettingsModal({
  client,
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
          : message.includes("Advanced schedule")
            ? "workspace.settingsAdvancedSchedule"
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
      closeLabel={t("common.cancel")}
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
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              isSaving && styles.disabled,
            ]}
          >
            {isSaving ? <ActivityIndicator color={colors.actionText} /> : null}
            <Text style={styles.saveButtonText}>
              {isSaving
                ? t("workspace.settingsSaving")
                : t("workspace.settingsSave")}
            </Text>
          </Pressable>
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
        <View style={styles.section}>
          <Text style={styles.label}>{t("workspace.workingDaysLabel")}</Text>
          <View style={styles.dayList}>
            {dayOptions.map((day) => {
              const selected = draft.workingDays.includes(day.value);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  key={day.value}
                  onPress={() => {
                    const workingDays = selected
                      ? draft.workingDays.filter((value) => value !== day.value)
                      : [...draft.workingDays, day.value].sort((a, b) => a - b);
                    change("workingDays", workingDays);
                  }}
                  style={[
                    styles.dayButton,
                    selected && styles.dayButtonSelected,
                  ]}
                >
                  <Text
                    style={[styles.dayText, selected && styles.dayTextSelected]}
                  >
                    {t(day.key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <DateTimePickerField
              label={t("workspace.startTimeLabel")}
              locale={locale}
              mode="time"
              onChange={(startTime) => change("startTime", startTime)}
              placeholder="09:00"
              t={t}
              value={draft.startTime}
            />
          </View>
          <View style={styles.timeField}>
            <DateTimePickerField
              label={t("workspace.endTimeLabel")}
              locale={locale}
              mode="time"
              onChange={(endTime) => change("endTime", endTime)}
              placeholder="17:00"
              t={t}
              value={draft.endTime}
            />
          </View>
        </View>
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
    name: "workspace.settingsNameInvalid",
    schedule: "workspace.scheduleInvalid",
    slug: "workspace.setupInvalidSlug",
    workingDays: "workspace.workingDaysInvalid",
  };
  return keys[error];
}

const styles = StyleSheet.create({
  content: { gap: 20, padding: 20, paddingBottom: 32 },
  dayButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dayButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayText: { ...typography.label, color: colors.primaryText },
  dayTextSelected: { color: colors.inverse },
  description: { ...typography.body, color: colors.secondaryText },
  disabled: { opacity: 0.6 },
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
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  saveButtonPressed: { backgroundColor: colors.actionPressed },
  saveButtonText: {
    ...typography.label,
    color: colors.actionText,
    fontWeight: "700",
  },
  section: { gap: 10 },
  timeField: { flex: 1, minWidth: 140 },
  timeRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
