import type { MessageKey } from "@schedule-app/i18n";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  createServiceDraft,
  type ServiceDraft,
  type ServiceValidationError,
  validateServiceDraft,
} from "../features/services/serviceCatalog";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import type { Service } from "../types";
import { ActionButton } from "./ActionButton";
import { FullscreenModal } from "./FullscreenModal";

type ServiceEditorModalProps = {
  readonly categories: readonly string[];
  readonly error: string | null;
  readonly isSaving: boolean;
  readonly onClose: () => void;
  readonly onSave: (draft: ServiceDraft) => Promise<void>;
  readonly service: Service | null;
  readonly t: (key: MessageKey) => string;
  readonly visible: boolean;
};

export function ServiceEditorModal({
  categories,
  error,
  isSaving,
  onClose,
  onSave,
  service,
  t,
  visible,
}: ServiceEditorModalProps) {
  const [draft, setDraft] = useState<ServiceDraft>(() =>
    createServiceDraft(service),
  );
  const [validationError, setValidationError] =
    useState<ServiceValidationError | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraft(createServiceDraft(service));
    setValidationError(null);
  }, [service, visible]);

  function updateDraft(patch: Partial<ServiceDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setValidationError(null);
  }

  async function handleSave() {
    const nextValidationError = validateServiceDraft(draft);
    setValidationError(nextValidationError);
    if (nextValidationError) return;

    try {
      await onSave(draft);
    } catch {
      // The parent displays the server error through the error prop.
    }
  }

  const errorMessage = validationError
    ? validationMessage(validationError, t)
    : error;

  return (
    <FullscreenModal
      closeLabel={t("common.cancel")}
      closeDisabled={isSaving}
      onClose={onClose}
      title={service ? t("mobile.serviceEdit") : t("mobile.serviceCreate")}
      visible={visible}
      footer={
        <View style={styles.actions}>
          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}
          <View style={styles.actionRow}>
            <ActionButton
              disabled={isSaving}
              label={t("common.cancel")}
              onPress={onClose}
              style={styles.actionButton}
              variant="neutral"
            />
            <ActionButton
              disabled={isSaving}
              label={t("mobile.serviceSave")}
              loading={isSaving}
              loadingLabel={t("common.loading")}
              onPress={() => void handleSave()}
              style={styles.actionButton}
              variant="primary"
            />
          </View>
        </View>
      }
    >
      <KeyboardAvoidingView behavior="padding" style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.description}>
            {t("mobile.servicesDescription")}
          </Text>
          <Field
            error={validationError === "name"}
            label={t("mobile.serviceName")}
            onChangeText={(name) => updateDraft({ name })}
            value={draft.name}
          />
          <View style={styles.categoryField}>
            <Text style={styles.label}>{t("mobile.serviceCategory")}</Text>
            {categories.length > 0 ? (
              <>
                <Text style={styles.categoryHint}>
                  {t("mobile.serviceCategoryHint")}
                </Text>
                <ScrollView
                  contentContainerStyle={styles.categoryOptions}
                  horizontal
                  keyboardShouldPersistTaps="handled"
                  showsHorizontalScrollIndicator={false}
                >
                  {categories.map((category) => {
                    const selected =
                      draft.category.trim().toLocaleLowerCase() ===
                      category.toLocaleLowerCase();
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={category}
                        onPress={() => updateDraft({ category })}
                        style={[
                          styles.categoryOption,
                          selected && styles.categoryOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            selected && styles.categoryOptionTextSelected,
                          ]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
            <TextInput
              accessibilityLabel={t("mobile.serviceCategory")}
              autoCapitalize="sentences"
              onChangeText={(category) => updateDraft({ category })}
              placeholder={t("mobile.serviceCategoryPlaceholder")}
              placeholderTextColor={colors.secondaryText}
              style={styles.input}
              value={draft.category}
            />
          </View>
          <Field
            error={validationError === "description"}
            label={t("mobile.serviceDescription")}
            multiline
            onChangeText={(description) => updateDraft({ description })}
            value={draft.description}
          />
          <View style={styles.row}>
            <View style={styles.rowField}>
              <Field
                error={validationError === "durationMinutes"}
                keyboardType="number-pad"
                label={t("mobile.serviceDuration")}
                onChangeText={(durationMinutes) =>
                  updateDraft({ durationMinutes })
                }
                value={draft.durationMinutes}
              />
            </View>
            <View style={styles.rowField}>
              <Field
                error={validationError === "priceAmount"}
                keyboardType="decimal-pad"
                label={t("mobile.servicePrice")}
                onChangeText={(priceAmount) => updateDraft({ priceAmount })}
                value={draft.priceAmount}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.rowField}>
              <Field
                error={validationError === "currency"}
                autoCapitalize="characters"
                label={t("mobile.serviceCurrency")}
                onChangeText={(currency) => updateDraft({ currency })}
                value={draft.currency}
              />
            </View>
            <View style={styles.rowField}>
              <Field
                error={validationError === "sortOrder"}
                keyboardType="number-pad"
                label={t("mobile.serviceSortOrder")}
                onChangeText={(sortOrder) => updateDraft({ sortOrder })}
                value={draft.sortOrder}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.rowField}>
              <Field
                error={validationError === "bufferBeforeMinutes"}
                keyboardType="number-pad"
                label={t("mobile.serviceBufferBefore")}
                onChangeText={(bufferBeforeMinutes) =>
                  updateDraft({ bufferBeforeMinutes })
                }
                value={draft.bufferBeforeMinutes}
              />
            </View>
            <View style={styles.rowField}>
              <Field
                error={validationError === "bufferAfterMinutes"}
                keyboardType="number-pad"
                label={t("mobile.serviceBufferAfter")}
                onChangeText={(bufferAfterMinutes) =>
                  updateDraft({ bufferAfterMinutes })
                }
                value={draft.bufferAfterMinutes}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </FullscreenModal>
  );
}

function Field({
  autoCapitalize = "none",
  error = false,
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  value,
}: {
  readonly autoCapitalize?: "none" | "characters";
  readonly error?: boolean;
  readonly keyboardType?: "decimal-pad" | "number-pad";
  readonly label: string;
  readonly multiline?: boolean;
  readonly onChangeText: (value: string) => void;
  readonly value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor={colors.secondaryText}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          error && styles.inputError,
        ]}
        value={value}
      />
    </View>
  );
}

function validationMessage(
  error: ServiceValidationError,
  t: ServiceEditorModalProps["t"],
): string {
  const keys: Record<ServiceValidationError, MessageKey> = {
    bufferAfterMinutes: "mobile.serviceBufferInvalid",
    bufferBeforeMinutes: "mobile.serviceBufferInvalid",
    currency: "mobile.serviceCurrencyInvalid",
    description: "mobile.serviceDescriptionInvalid",
    durationMinutes: "mobile.serviceDurationInvalid",
    name: "mobile.serviceNameInvalid",
    priceAmount: "mobile.servicePriceInvalid",
    sortOrder: "mobile.serviceSortOrderInvalid",
  };
  return t(keys[error]);
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", gap: 12 },
  actions: { gap: 12 },
  body: { flex: 1 },
  categoryField: { gap: 8, marginTop: 16 },
  categoryHint: { ...typography.caption, color: colors.secondaryText },
  categoryOptions: { flexDirection: "row", gap: 8 },
  categoryOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  categoryOptionSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  categoryOptionText: { ...typography.label, color: colors.primaryText },
  categoryOptionTextSelected: { color: colors.accent, fontWeight: "700" },
  description: {
    ...typography.body,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  error: { ...typography.caption, color: colors.danger },
  field: { gap: 8, marginTop: 16 },
  form: { padding: 20, paddingBottom: 40 },
  input: {
    ...typography.body,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.primaryText,
    height: 48,
    paddingHorizontal: 16,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  inputError: { borderColor: colors.danger, borderWidth: 1 },
  label: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: "600",
  },
  multilineInput: {
    borderRadius: radii.surface,
    height: 96,
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  actionButton: { flex: 1 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1, minWidth: 0 },
  title: { ...typography.section, color: colors.primaryText },
});
