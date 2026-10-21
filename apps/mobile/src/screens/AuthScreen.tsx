import { createTranslator, type SupportedLocale } from "@schedule-app/i18n";
import type { Session } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthForm } from "../components/AuthForm";
import { EmailConfirmationScreen } from "../components/EmailConfirmationScreen";
import { LocalePicker } from "../components/LocalePicker";
import { mobileEnv } from "../config/env";
import { getAuthErrorMessageKey } from "../features/auth/authErrorMessage";
import { type AuthMode, authenticate } from "../features/auth/authentication";
import type { AuthNotice } from "../features/auth/authNotice";
import {
  getCurrentWebOrigin,
  getEmailRedirectTo,
} from "../features/auth/authRedirect";
import { isEmailConfirmationRequired } from "../features/auth/emailConfirmation";
import {
  type AuthField,
  type AuthFieldTouchState,
  getVisibleAuthFieldErrors,
} from "../features/auth/fieldValidation";
import { analytics, analyticsEvents } from "../lib/analytics";
import { supabase } from "../lib/supabase";
import { colors } from "../theme/tokens";
import { typography } from "../theme/typography";

type AuthScreenProps = {
  readonly authCallbackFailed: boolean;
  readonly initialMode: AuthMode;
  readonly locale: SupportedLocale;
  readonly onAuthenticated: (session: Session) => void;
  readonly onLocaleChange: (locale: SupportedLocale) => void;
  readonly sessionRestoreFailed: boolean;
};

type ConfirmationState = {
  readonly descriptionKey:
    | "auth.confirmationDescription"
    | "auth.emailNotConfirmed";
  readonly email: string;
};

export function AuthScreen({
  authCallbackFailed,
  initialMode,
  locale,
  onAuthenticated,
  onLocaleChange,
  sessionRestoreFailed,
}: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [touchedFields, setTouchedFields] = useState<AuthFieldTouchState>({
    email: false,
    password: false,
  });
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(
    null,
  );
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const errors = useMemo(
    () => getVisibleAuthFieldErrors({ email, password }, touchedFields),
    [email, password, touchedFields],
  );

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setConfirmation(null);
    setNotice(null);
    setTouchedFields({ email: false, password: false });
  }

  function touchField(field: AuthField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  async function submit() {
    if (!supabase) return;

    setBusy(true);
    setTouchedFields({ email: true, password: true });
    setNotice(null);
    const redirectTo = getEmailRedirectTo(
      Platform.OS === "web" ? "web" : "native",
      Platform.OS === "web" ? getCurrentWebOrigin() : undefined,
      mobileEnv.authRedirectUrl,
    );
    const result = await authenticate(
      supabase,
      mode,
      { email, password },
      redirectTo,
      locale,
    );
    setBusy(false);

    if (result.kind === "validationError") {
      return;
    }

    if (result.kind === "requestError") {
      if (isEmailConfirmationRequired(result.error)) {
        setPassword("");
        setMode("signIn");
        setConfirmation({
          descriptionKey: "auth.emailNotConfirmed",
          email: email.trim(),
        });
        return;
      }

      setNotice({
        message: t(getAuthErrorMessageKey(result.error)),
        tone: "error",
      });
      return;
    }

    if (result.kind === "confirmationRequired") {
      analytics.track(analyticsEvents.accountSignedUp);
      setPassword("");
      setMode("signIn");
      setConfirmation({
        descriptionKey: "auth.confirmationDescription",
        email: email.trim(),
      });
      return;
    }

    analytics.track(
      mode === "signUp"
        ? analyticsEvents.accountSignedUp
        : analyticsEvents.accountSignedIn,
    );
    onAuthenticated(result.session);
  }

  const title = t(mode === "signUp" ? "auth.signUpTitle" : "auth.signInTitle");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.languagePicker}>
        <LocalePicker locale={locale} onLocaleChange={onLocaleChange} />
      </View>
      <Text style={styles.eyebrow}>{t("common.appName")}</Text>
      {confirmation ? (
        <EmailConfirmationScreen
          descriptionKey={confirmation.descriptionKey}
          email={confirmation.email}
          onBackToSignIn={() => {
            setConfirmation(null);
            setMode("signIn");
            setNotice(null);
            setTouchedFields({ email: false, password: false });
          }}
          t={t}
        />
      ) : (
        <>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{t("mobile.description")}</Text>
          {sessionRestoreFailed && (
            <Text accessibilityRole="alert" style={styles.restoreError}>
              {t("auth.sessionRestoreFailed")}
            </Text>
          )}
          {authCallbackFailed && (
            <Text accessibilityRole="alert" style={styles.restoreError}>
              {t("auth.confirmationCallbackFailed")}
            </Text>
          )}
          <AuthForm
            busy={busy}
            email={email}
            errors={errors}
            mode={mode}
            notice={notice ?? undefined}
            onEmailBlur={() => touchField("email")}
            onEmailChange={setEmail}
            onModeChange={changeMode}
            onPasswordBlur={() => touchField("password")}
            onPasswordChange={setPassword}
            onSubmit={() => void submit()}
            password={password}
            t={t}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    gap: 16,
    justifyContent: "center",
    minHeight: "100%",
    padding: 16,
  },
  description: {
    ...typography.body,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  eyebrow: { ...typography.eyebrow, color: colors.accent },
  languagePicker: { alignItems: "flex-end" },
  restoreError: { ...typography.body, color: colors.danger },
  title: { ...typography.heading, color: colors.primaryText },
});
