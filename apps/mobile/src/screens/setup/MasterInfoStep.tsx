import type { MessageKey } from "@schedule-app/i18n";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type {
  OnboardingDraft,
  SetupTranslator,
} from "../../features/workspace/setupTypes";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { normalizeBookingSlug } from "../../utils/slug";

type MasterInfoStepProps = {
  readonly draft: OnboardingDraft;
  readonly errorKey?: MessageKey;
  readonly onChange: (patch: Partial<OnboardingDraft>) => void;
  readonly t: SetupTranslator;
};

export function MasterInfoStep({
  draft,
  errorKey,
  onChange,
  t,
}: MasterInfoStepProps) {
  return (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>{t("workspace.setupStepMaster")}</Text>
      <Text style={styles.stepDescription}>
        {t("workspace.setupStepMasterDescription")}
      </Text>
      <Text style={styles.label}>{t("workspace.namePlaceholder")} *</Text>
      <TextInput
        autoCapitalize="words"
        onChangeText={(value) => onChange({ name: value })}
        placeholder={t("workspace.namePlaceholder")}
        style={styles.input}
        value={draft.name}
      />
      <Text style={styles.label}>{t("workspace.slugPlaceholder")} *</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={(value) =>
          onChange({ slug: normalizeBookingSlug(value) })
        }
        placeholder={t("workspace.slugPlaceholder")}
        style={styles.input}
        value={draft.slug}
      />
      {errorKey === "workspace.setupInvalidSlug" && (
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
