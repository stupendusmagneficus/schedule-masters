import type { MessageKey } from "@schedule-app/i18n";
import { StyleSheet, Text, TextInput, View } from "react-native";

import type {
  OnboardingDraft,
  SetupTranslator,
} from "../../features/workspace/setupTypes";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";

type ServiceStepProps = {
  readonly draft: OnboardingDraft;
  readonly errorKey?: MessageKey;
  readonly onChange: (patch: Partial<OnboardingDraft>) => void;
  readonly t: SetupTranslator;
};

export function ServiceStep({
  draft,
  errorKey,
  onChange,
  t,
}: ServiceStepProps) {
  return (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>{t("workspace.setupStepService")}</Text>
      <Text style={styles.stepDescription}>
        {t("workspace.setupStepServiceDescription")}
      </Text>
      <Text style={styles.label}>{t("workspace.servicePlaceholder")} *</Text>
      <TextInput
        autoCapitalize="sentences"
        onChangeText={(value) => onChange({ serviceName: value })}
        placeholder={t("workspace.servicePlaceholder")}
        style={styles.input}
        value={draft.serviceName}
      />
      <Text style={styles.label}>{t("workspace.pricePlaceholder")} *</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(value) => onChange({ price: value })}
        placeholder={t("workspace.pricePlaceholder")}
        style={styles.input}
        value={draft.price}
      />
      {errorKey === "workspace.priceInvalid" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(errorKey)}
        </Text>
      )}
      <Text style={styles.label}>{t("workspace.durationPlaceholder")} *</Text>
      <TextInput
        keyboardType="number-pad"
        onChangeText={(value) => onChange({ duration: value })}
        placeholder={t("workspace.durationPlaceholder")}
        style={styles.input}
        value={draft.duration}
      />
      {errorKey === "workspace.durationInvalid" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(errorKey)}
        </Text>
      )}
      {errorKey === "workspace.setupInvalidService" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(errorKey)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    gap: 16,
    padding: 20,
  },
  error: { ...typography.caption, color: colors.danger },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderRadius: radii.control,
    borderWidth: 1,
    fontSize: typography.body.fontSize,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  label: {
    ...typography.label,
    color: colors.primaryText,
    marginBottom: -8,
  },
  stepDescription: { ...typography.body, color: colors.secondaryText },
  stepTitle: { ...typography.section, color: colors.primaryText },
});
