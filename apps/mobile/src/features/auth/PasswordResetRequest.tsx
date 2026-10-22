import type { MessageKey } from "@schedule-app/i18n";
import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import { AuthEmailAction } from "./AuthEmailAction";
import type { AuthRecoveryClient } from "./authRecovery";

export function PasswordResetRequest({
  client,
  initialEmail,
  redirectTo,
  onBack,
  t,
}: {
  readonly client: AuthRecoveryClient;
  readonly initialEmail: string;
  readonly redirectTo: string;
  readonly onBack: () => void;
  readonly t: (key: MessageKey) => string;
}) {
  const [email, setEmail] = useState(initialEmail);
  return (
    <>
      <Text accessibilityRole="header" style={styles.title}>
        {t("auth.recoveryTitle")}
      </Text>
      <Text style={styles.description}>{t("auth.recoveryDescription")}</Text>
      <Text style={styles.label}>{t("auth.emailLabel")}</Text>
      <TextInput
        accessibilityLabel={t("auth.emailLabel")}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <AuthEmailAction
        client={client}
        email={email}
        kind="recovery"
        redirectTo={redirectTo}
        t={t}
      />
      <ActionButton
        label={t("auth.confirmationBackToSignIn")}
        onPress={onBack}
        variant="quiet"
      />
    </>
  );
}
const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.primaryText },
  description: { ...typography.body, color: colors.secondaryText },
  label: { ...typography.label, color: colors.primaryText },
  input: {
    backgroundColor: colors.surface,
    color: colors.primaryText,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    fontSize: typography.body.fontSize,
  },
});
