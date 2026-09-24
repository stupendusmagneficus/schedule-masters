import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { MessageKey } from "@schedule-app/i18n";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { AuthMode } from "../features/auth/authentication";
import type { AuthNotice } from "../features/auth/authNotice";
import { colors, radii } from "../theme/tokens";
import { typography } from "../theme/typography";

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
  password,
  t,
}: AuthFormProps) {
  const isSignUp = mode === "signUp";
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
      <View style={styles.field}>
        <Text style={styles.label}>
          {t("auth.passwordLabel")} <Text style={styles.required}>*</Text>
        </Text>
        <View
          style={[
            styles.passwordInput,
            errors.includes("password") && styles.inputError,
          ]}
        >
          <TextInput
            accessibilityHint={
              errors.includes("password")
                ? t("auth.passwordTooShort")
                : undefined
            }
            accessibilityLabel={t("auth.passwordLabel")}
            autoCapitalize="none"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            onBlur={onPasswordBlur}
            onChangeText={onPasswordChange}
            placeholder={t("auth.passwordLabel")}
            secureTextEntry={!isPasswordVisible}
            style={styles.passwordTextInput}
            textContentType={isSignUp ? "newPassword" : "password"}
            value={password}
          />
          <Pressable
            accessibilityLabel={
              isPasswordVisible
                ? t("auth.hidePassword")
                : t("auth.showPassword")
            }
            accessibilityRole="button"
            accessibilityState={{ selected: isPasswordVisible }}
            hitSlop={8}
            onPress={() => setIsPasswordVisible((current) => !current)}
            style={styles.passwordVisibilityButton}
          >
            <MaterialCommunityIcons
              color={colors.secondaryText}
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
            />
          </Pressable>
        </View>
        <Text style={styles.hint}>{t("auth.passwordHint")}</Text>
        {errors.includes("password") && (
          <Text accessibilityRole="alert" style={styles.error}>
            {t("auth.passwordTooShort")}
          </Text>
        )}
      </View>
      {notice && (
        <View
          accessibilityRole="alert"
          style={[
            styles.notice,
            notice.tone === "error" ? styles.noticeError : styles.noticeInfo,
          ]}
        >
          <MaterialCommunityIcons
            color={notice.tone === "error" ? colors.danger : colors.accent}
            name={
              notice.tone === "error"
                ? "alert-circle-outline"
                : "information-outline"
            }
            size={22}
          />
          <Text
            style={[
              styles.noticeText,
              notice.tone === "error"
                ? styles.noticeErrorText
                : styles.noticeInfoText,
            ]}
          >
            {notice.message}
          </Text>
        </View>
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
  passwordInput: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
  },
  passwordTextInput: {
    flex: 1,
    fontSize: typography.body.fontSize,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  passwordVisibilityButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  link: {
    color: colors.accent,
    textAlign: "center",
    ...typography.label,
  },
  notice: {
    alignItems: "flex-start",
    borderRadius: radii.control,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  noticeError: { backgroundColor: colors.dangerSoft },
  noticeErrorText: { color: colors.danger },
  noticeInfo: { backgroundColor: colors.accentSoft },
  noticeInfoText: { color: colors.accentPressed },
  noticeText: { ...typography.metadata, flex: 1 },
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
  required: { color: colors.danger },
  requiredHint: { ...typography.caption, color: colors.secondaryText },
});
