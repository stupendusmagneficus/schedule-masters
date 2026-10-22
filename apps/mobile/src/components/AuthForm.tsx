import type { MessageKey } from "@schedule-app/i18n";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { AuthMode } from "../features/auth/authentication";
import type { AuthNotice } from "../features/auth/authNotice";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";
import { ActionButton } from "./ActionButton";
import { AuthFeedback } from "./AuthFeedback";
import { PasswordField } from "./PasswordField";

type AuthFormProps = {
  readonly busy: boolean;
  readonly email: string;
  readonly errors: ReadonlyArray<"email" | "password">;
  readonly mode: AuthMode;
  readonly notice?: AuthNotice;
  readonly onEmailBlur: () => void;
  readonly onEmailChange: (value: string) => void;
  readonly onModeChange: (mode: AuthMode) => void;
  readonly onPasswordChange: (value: string) => void;
  readonly onPasswordBlur: () => void;
  readonly onForgotPassword: () => void;
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
  onEmailBlur,
  onEmailChange,
  onModeChange,
  onPasswordChange,
  onPasswordBlur,
  onSubmit,
  onForgotPassword,
  password,
  t,
}: AuthFormProps) {
  const isSignUp = mode === "signUp";

  return (
    <View style={styles.form}>
      <Text style={styles.requiredHint}>{t("auth.requiredHint")}</Text>
      <View style={styles.field}>
        <Text style={styles.label}>
          {t("auth.emailLabel")} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          accessibilityHint={
            errors.includes("email") ? t("auth.emailInvalid") : undefined
          }
          accessibilityLabel={t("auth.emailLabel")}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onBlur={onEmailBlur}
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
      <PasswordField
        value={password}
        onChange={onPasswordChange}
        onBlur={onPasswordBlur}
        label={t("auth.passwordLabel")}
        newPassword={isSignUp}
        t={t}
        error={
          errors.includes("password") ? t("auth.passwordTooShort") : undefined
        }
      />
      {notice && <AuthFeedback notice={notice} />}
      <ActionButton
        disabled={busy}
        label={t(isSignUp ? "auth.signUp" : "auth.signIn")}
        loading={busy}
        loadingLabel={t("common.loading")}
        onPress={onSubmit}
        style={styles.actionButton}
        variant="primary"
      />
      {!isSignUp && (
        <ActionButton
          disabled={busy}
          label={t("auth.forgotPassword")}
          onPress={onForgotPassword}
          variant="quiet"
        />
      )}
      <ActionButton
        disabled={busy}
        label={t(isSignUp ? "auth.signInPrompt" : "auth.signUpPrompt")}
        onPress={() => onModeChange(isSignUp ? "signIn" : "signUp")}
        size="compact"
        style={styles.actionButton}
        variant="quiet"
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    height: 48,
    paddingHorizontal: 12,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  inputError: { borderColor: colors.danger },
  label: { ...typography.label, color: colors.primaryText },
  actionButton: { width: "100%" },
  required: { color: colors.danger },
  requiredHint: { ...typography.caption, color: colors.secondaryText },
});
