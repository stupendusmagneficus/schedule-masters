import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { MessageKey } from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows } from "../theme/tokens";
import { typography } from "../theme/typography";

type EmailConfirmationScreenProps = {
  readonly descriptionKey:
    | "auth.confirmationDescription"
    | "auth.emailNotConfirmed";
  readonly email: string;
  readonly onBackToSignIn: () => void;
  readonly t: (key: MessageKey) => string;
};

export function EmailConfirmationScreen({
  descriptionKey,
  email,
  onBackToSignIn,
  t,
}: EmailConfirmationScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("auth.confirmationTitle")}</Text>
      <Text style={styles.description}>{t(descriptionKey)}</Text>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <MaterialCommunityIcons
            color={colors.accent}
            name="email-check-outline"
            size={28}
          />
        </View>
        <Text style={styles.label}>{t("auth.confirmationEmailLabel")}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onBackToSignIn}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          {t("auth.confirmationBackToSignIn")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    gap: 8,
    padding: 20,
    ...shadows.surface,
  },
  container: { gap: 20, width: "100%" },
  description: { ...typography.body, color: colors.secondaryText },
  email: { ...typography.body, color: colors.primaryText, fontWeight: "700" },
  iconWrapper: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 52,
    justifyContent: "center",
    marginBottom: 4,
    width: 52,
  },
  label: { ...typography.caption, color: colors.secondaryText },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    width: "100%",
  },
  primaryButtonText: {
    ...typography.label,
    color: colors.actionText,
    fontWeight: "700",
  },
  title: { ...typography.heading, color: colors.primaryText },
});
