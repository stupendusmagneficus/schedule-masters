import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import type { MessageKey } from "@schedule-app/i18n";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";

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
      <ActionButton
        label={t("auth.confirmationBackToSignIn")}
        onPress={onBackToSignIn}
        style={styles.returnButton}
        variant="quiet"
      />
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
  returnButton: { width: "100%" },
  title: { ...typography.heading, color: colors.primaryText },
});
