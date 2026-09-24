import type { MessageKey } from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { AuthMode } from "../features/auth/authentication";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

type AuthFormProps = {
  readonly busy: boolean;
  readonly email: string;
  readonly errors: ReadonlyArray<"email" | "password">;
  readonly mode: AuthMode;
  readonly notice?: string;
  readonly onEmailChange: (value: string) => void;
  readonly onModeChange: (mode: AuthMode) => void;
  readonly onPasswordChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly password: string;
  readonly t: (key: MessageKey) => string;
};

export function AuthForm({
  busy,
  email,
  errors,
  mode,
  notice,
  onEmailChange,
  onModeChange,
  onPasswordChange,
  onSubmit,
  password,
  t,
}: AuthFormProps) {
  const isSignUp = mode === "signUp";

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={styles.label}>{t("auth.emailLabel")}</Text>
        <TextInput
          accessibilityHint={
            errors.includes("email") ? t("auth.emailInvalid") : undefined
          }
          accessibilityLabel={t("auth.emailLabel")}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={onEmailChange}
          placeholder={t("auth.emailLabel")}
          style={[styles.input, errors.includes("email") && styles.inputError]}
          textContentType="emailAddress"
          value={email}
        />
        {errors.includes("email") && (
          <Text accessibilityRole="alert" style={styles.error}>
            {t("auth.emailInvalid")}
          </Text>
        )}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>{t("auth.passwordLabel")}</Text>
        <TextInput
          accessibilityHint={
            errors.includes("password") ? t("auth.passwordTooShort") : undefined
          }
          accessibilityLabel={t("auth.passwordLabel")}
          autoCapitalize="none"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          onChangeText={onPasswordChange}
          placeholder={t("auth.passwordLabel")}
          secureTextEntry
          style={[
            styles.input,
            errors.includes("password") && styles.inputError,
          ]}
          textContentType={isSignUp ? "newPassword" : "password"}
          value={password}
        />
        <Text style={styles.hint}>{t("auth.passwordHint")}</Text>
        {errors.includes("password") && (
          <Text accessibilityRole="alert" style={styles.error}>
            {t("auth.passwordTooShort")}
          </Text>
        )}
      </View>
      {notice && (
        <Text accessibilityRole="alert" style={styles.notice}>
          {notice}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={onSubmit}
        style={[styles.primaryButton, busy && styles.disabledButton]}
      >
        <Text style={styles.primaryButtonText}>
          {busy
            ? t("common.loading")
            : t(isSignUp ? "auth.signUp" : "auth.signIn")}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => onModeChange(isSignUp ? "signIn" : "signUp")}
      >
        <Text style={styles.link}>
          {t(isSignUp ? "auth.signInPrompt" : "auth.signUpPrompt")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  disabledButton: { opacity: 0.6 },
  error: { ...typography.caption, color: colors.danger },
  field: { gap: 6 },
  form: { gap: 16, width: "100%" },
  hint: { ...typography.caption, color: colors.secondaryText },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    fontSize: typography.body.fontSize,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  inputError: { borderColor: colors.danger },
  label: { ...typography.label, color: colors.primaryText },
  link: {
    color: colors.accent,
    textAlign: "center",
    ...typography.label,
  },
  notice: { ...typography.body, color: colors.secondaryText },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    width: "100%",
  },
  primaryButtonText: {
    ...typography.label,
    color: colors.inverse,
    fontWeight: "700",
  },
});
