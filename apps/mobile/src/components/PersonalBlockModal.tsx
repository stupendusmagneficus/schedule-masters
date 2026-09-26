import type { MessageKey } from "@schedule-app/i18n";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  type PersonalBlockDraft,
  validatePersonalBlockDraft,
} from "../features/availability/personalBlocks";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { DateTimePickerField } from "./DateTimePickerField";
import { FullscreenModal } from "./FullscreenModal";

type PersonalBlockModalProps = {
  readonly error: string | null;
  readonly initialDate: string;
  readonly isSaving: boolean;
  readonly onClose: () => void;
  readonly onSave: (draft: PersonalBlockDraft) => Promise<void>;
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
};

export function PersonalBlockModal({
  error,
  initialDate,
  isSaving,
  onClose,
  onSave,
  t,
  visible,
}: PersonalBlockModalProps) {
  const [draft, setDraft] = useState<PersonalBlockDraft>(() =>
    createInitialDraft(initialDate),
  );
  const [validationError, setValidationError] =
    useState<ReturnType<typeof validatePersonalBlockDraft>>(null);

  useEffect(() => {
    if (!visible) return;
    setDraft(createInitialDraft(initialDate));
    setValidationError(null);
  }, [initialDate, visible]);

  async function handleSave() {
    const nextValidationError = validatePersonalBlockDraft(draft);
    setValidationError(nextValidationError);
    if (nextValidationError) return;

    try {
      await onSave(draft);
    } catch {
      // The parent exposes the server error through the error prop.
    }
  }

  const errorMessage = validationError
    ? validationMessage(validationError, t)
    : error && serverErrorMessage(error, t);

  return (
    <FullscreenModal
      closeLabel={t("common.cancel")}
      closeDisabled={isSaving}
      onClose={onClose}
      title={t("mobile.personalBlockTitle")}
      visible={visible}
      footer={
        <View style={styles.actions}>
          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              isSaving && styles.disabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isSaving ? t("common.loading") : t("mobile.personalBlockCreate")}
            </Text>
          </Pressable>
        </View>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.body}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.description}>
            {t("mobile.personalBlockDescription")}
          </Text>
          <DateTimePickerField
            label={t("mobile.personalBlockDate")}
            mode="date"
            onChange={(date) => setDraft((current) => ({ ...current, date }))}
            placeholder={t("mobile.personalBlockDatePlaceholder")}
            value={draft.date}
          />
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <DateTimePickerField
                label={t("mobile.personalBlockStart")}
                mode="time"
                onChange={(startTime) =>
                  setDraft((current) => ({ ...current, startTime }))
                }
                placeholder={t("mobile.personalBlockTimePlaceholder")}
                value={draft.startTime}
              />
            </View>
            <View style={styles.timeField}>
              <DateTimePickerField
                label={t("mobile.personalBlockEnd")}
                mode="time"
                onChange={(endTime) =>
                  setDraft((current) => ({ ...current, endTime }))
                }
                placeholder={t("mobile.personalBlockTimePlaceholder")}
                value={draft.endTime}
              />
            </View>
          </View>
          <Field
            label={t("mobile.personalBlockReason")}
            onChangeText={(reason) =>
              setDraft((current) => ({ ...current, reason }))
            }
            placeholder={t("mobile.personalBlockReasonPlaceholder")}
            value={draft.reason}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </FullscreenModal>
  );
}

function Field({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  readonly label: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder: string;
  readonly value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function createInitialDraft(date: string): PersonalBlockDraft {
  return { date, endTime: "13:00", reason: "", startTime: "12:00" };
}

function validationMessage(
  error: NonNullable<ReturnType<typeof validatePersonalBlockDraft>>,
  t: PersonalBlockModalProps["t"],
): string {
  const keys: Record<typeof error, MessageKey> = {
    date: "mobile.personalBlockDateInvalid",
    endBeforeStart: "mobile.personalBlockEndBeforeStart",
    time: "mobile.personalBlockTimeInvalid",
  };
  return t(keys[error]);
}

function serverErrorMessage(error: string, t: PersonalBlockModalProps["t"]) {
  if (error.includes("overlaps")) return t("mobile.personalBlockOverlap");
  return t("common.error");
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  body: { flex: 1 },
  description: {
    ...typography.body,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  disabled: { opacity: 0.6 },
  error: { ...typography.caption, color: colors.danger, marginBottom: 8 },
  field: { gap: 6, marginTop: 16 },
  form: { padding: 20, paddingBottom: 32 },
  input: {
    ...typography.body,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.primaryText,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  label: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "600",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonPressed: { backgroundColor: colors.actionPressed },
  primaryButtonText: { ...typography.label, color: colors.actionText },
  timeField: { flex: 1 },
  timeRow: { flexDirection: "row", gap: 8 },
});
